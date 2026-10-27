output "gke_cluster_name" {
  description = "GKE Cluster name"
  value       = google_container_cluster.primary.name
}

output "gke_cluster_endpoint" {
  description = "GKE Control Plane endpoint"
  value       = google_container_cluster.primary.endpoint
  sensitive   = true
}

output "alloydb_cluster_name" {
  description = "AlloyDB cluster resource name"
  value       = google_alloydb_cluster.open_judy.name
}

output "alloydb_primary_instance_uri" {
  description = "AlloyDB primary instance URI for alloydb-auth-proxy in k8s/base/alloydb-proxy.yaml"
  value       = "projects/${var.project_id}/locations/${var.region}/clusters/${google_alloydb_cluster.open_judy.cluster_id}/instances/${google_alloydb_instance.primary.instance_id}"
}

output "alloydb_primary_ip" {
  description = "Private IP address of the AlloyDB primary instance"
  value       = google_alloydb_instance.primary.ip_address
}

output "audio_storage_bucket" {
  description = "GCS bucket name for court hearing audio/video recordings"
  value       = google_storage_bucket.audio_storage.name
}

output "artifact_registry_repository_url" {
  description = "Artifact Registry Docker repository URL for k8s/overlays/gke-alloydb"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}"
}

output "workload_service_account_email" {
  description = "GCP Service Account email bound via GKE Workload Identity"
  value       = google_service_account.workload_sa.email
}
