variable "project_id" {
  description = "Google Cloud Project ID for Open Judy infrastructure"
  type        = string
}

variable "region" {
  description = "GCP region for GKE, AlloyDB, and Artifact Registry"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "Primary GCP zone inside the region"
  type        = string
  default     = "us-central1-a"
}

variable "environment" {
  description = "Deployment environment label (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "k8s_namespace" {
  description = "Kubernetes namespace used by Open Judy workloads (matches k8s/overlays/gke-alloydb)"
  type        = string
  default     = "open-judy-prod"
}

variable "k8s_service_account" {
  description = "Kubernetes ServiceAccount bound via Workload Identity"
  type        = string
  default     = "default"
}

variable "gke_cluster_name" {
  description = "Name of the GKE cluster"
  type        = string
  default     = "open-judy-gke"
}

variable "gke_machine_type" {
  description = "Machine type for GKE worker nodes"
  type        = string
  default     = "e2-standard-4"
}

variable "gke_min_nodes" {
  description = "Minimum node count in the GKE node pool"
  type        = number
  default     = 2
}

variable "gke_max_nodes" {
  description = "Maximum node count in the GKE node pool"
  type        = number
  default     = 6
}

variable "alloydb_cluster_id" {
  description = "AlloyDB cluster identifier"
  type        = string
  default     = "open-judy-alloydb"
}

variable "alloydb_instance_id" {
  description = "AlloyDB primary instance identifier"
  type        = string
  default     = "open-judy-alloydb-primary"
}

variable "alloydb_cpu_count" {
  description = "vCPU count for the AlloyDB primary instance (2, 4, 8, 16, etc.)"
  type        = number
  default     = 2
}

variable "db_user" {
  description = "Initial AlloyDB PostgreSQL user"
  type        = string
  default     = "judy_user"
}

variable "db_password" {
  description = "Initial password for AlloyDB PostgreSQL user"
  type        = string
  sensitive   = true
}

variable "artifact_registry_repo_id" {
  description = "Artifact Registry Docker repository ID"
  type        = string
  default     = "open-judy-repo"
}
