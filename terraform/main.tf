locals {
  common_labels = {
    application = "open-judy"
    environment = var.environment
    managed_by  = "terraform"
  }

  required_apis = [
    "compute.googleapis.com",
    "container.googleapis.com",
    "alloydb.googleapis.com",
    "servicenetworking.googleapis.com",
    "artifactregistry.googleapis.com",
    "storage.googleapis.com",
    "secretmanager.googleapis.com",
    "aiplatform.googleapis.com",
    "discoveryengine.googleapis.com",
  ]
}

# ============================================================================
# 1. Enable Required Google Cloud APIs
# ============================================================================
resource "google_project_service" "apis" {
  for_each           = toset(local.required_apis)
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

# ============================================================================
# 2. VPC Network, Subnets & Private Services Access (for AlloyDB)
# ============================================================================
resource "google_compute_network" "vpc" {
  name                    = "open-judy-vpc"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.apis]
}

resource "google_compute_subnetwork" "gke_subnet" {
  name                     = "open-judy-gke-subnet"
  ip_cidr_range            = "10.10.0.0/20"
  region                   = var.region
  network                  = google_compute_network.vpc.id
  private_ip_google_access = true

  secondary_ip_range {
    range_name    = "gke-pods"
    ip_cidr_range = "10.20.0.0/16"
  }

  secondary_ip_range {
    range_name    = "gke-services"
    ip_cidr_range = "10.30.0.0/20"
  }
}

resource "google_compute_global_address" "alloydb_psa_range" {
  name          = "open-judy-alloydb-psa-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "alloydb_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.alloydb_psa_range.name]
  depends_on              = [google_project_service.apis]
}

# ============================================================================
# 3. Google Kubernetes Engine (GKE) Cluster & Node Pool
# ============================================================================
resource "google_container_cluster" "primary" {
  name                     = var.gke_cluster_name
  location                 = var.region
  remove_default_node_pool = true
  initial_node_count       = 1
  network                  = google_compute_network.vpc.id
  subnetwork               = google_compute_subnetwork.gke_subnet.id
  deletion_protection      = false

  ip_allocation_policy {
    cluster_secondary_range_name  = "gke-pods"
    services_secondary_range_name = "gke-services"
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  release_channel {
    channel = "REGULAR"
  }

  resource_labels = local.common_labels

  depends_on = [google_project_service.apis]
}

resource "google_container_node_pool" "primary_nodes" {
  name       = "${var.gke_cluster_name}-node-pool"
  location   = var.region
  cluster    = google_container_cluster.primary.name
  node_count = var.gke_min_nodes

  autoscaling {
    min_node_count = var.gke_min_nodes
    max_node_count = var.gke_max_nodes
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    machine_type = var.gke_machine_type
    disk_size_gb = 100
    disk_type    = "pd-balanced"

    service_account = google_service_account.workload_sa.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    labels = local.common_labels
  }
}

# ============================================================================
# 4. AlloyDB for PostgreSQL 16 (with pgvector support)
# ============================================================================
resource "google_alloydb_cluster" "open_judy" {
  cluster_id       = var.alloydb_cluster_id
  location         = var.region
  database_version = "POSTGRES_16"

  network_config {
    network = google_compute_network.vpc.id
  }

  initial_user {
    user     = var.db_user
    password = var.db_password
  }

  labels     = local.common_labels
  depends_on = [google_service_networking_connection.alloydb_vpc_connection]
}

resource "google_alloydb_instance" "primary" {
  cluster       = google_alloydb_cluster.open_judy.name
  instance_id   = var.alloydb_instance_id
  instance_type = "PRIMARY"

  machine_config {
    cpu_count = var.alloydb_cpu_count
  }

  database_flags = {
    "alloydb.iam_authentication" = "on"
    "alloydb.enable_pgaudit"     = "on"
  }

  labels = local.common_labels
}

# ============================================================================
# 5. Google Cloud Storage (Court Audio & Video Recordings)
# ============================================================================
resource "google_storage_bucket" "audio_storage" {
  name                        = "${var.project_id}-open-judy-audio"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = false

  versioning {
    enabled = true
  }

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "PUT", "POST", "OPTIONS"]
    response_header = ["Content-Type", "Range", "Accept-Ranges", "Content-Range"]
    max_age_seconds = 3600
  }

  labels     = local.common_labels
  depends_on = [google_project_service.apis]
}

# ============================================================================
# 6. Artifact Registry (Container Images for Microservices, Pipeline & UI)
# ============================================================================
resource "google_artifact_registry_repository" "docker_repo" {
  location      = var.region
  repository_id = var.artifact_registry_repo_id
  description   = "Open Judy container images (Quarkus microservices, Python pipeline, Next.js UI)"
  format        = "DOCKER"
  labels        = local.common_labels
  depends_on    = [google_project_service.apis]
}

# ============================================================================
# 7. Secret Manager (Database, Gemini API Key, Keycloak Admin)
# ============================================================================
resource "google_secret_manager_secret" "db_password" {
  secret_id = "open-judy-db-password"
  labels    = local.common_labels

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret" "gemini_api_key" {
  secret_id = "open-judy-gemini-api-key"
  labels    = local.common_labels

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

# ============================================================================
# 8. IAM & Workload Identity for Open Judy Microservices
# ============================================================================
resource "google_service_account" "workload_sa" {
  account_id   = "open-judy-workload-sa"
  display_name = "Open Judy GKE Workload Service Account"
}

resource "google_project_iam_member" "workload_roles" {
  for_each = toset([
    "roles/alloydb.client",
    "roles/storage.objectAdmin",
    "roles/aiplatform.user",
    "roles/discoveryengine.viewer",
    "roles/secretmanager.secretAccessor",
    "roles/artifactregistry.reader",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.workload_sa.email}"
}

resource "google_service_account_iam_member" "workload_identity_binding" {
  service_account_id = google_service_account.workload_sa.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[${var.k8s_namespace}/${var.k8s_service_account}]"
  depends_on         = [google_container_cluster.primary]
}
