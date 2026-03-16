resource "google_artifact_registry_repository" "app" {
  location      = var.region
  repository_id = "medical-form"
  format        = "DOCKER"
  description   = "医療フォームアプリ Docker イメージ"

  depends_on = [google_project_service.apis]
}
