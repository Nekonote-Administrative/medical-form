output "service_url" {
  description = "Cloud Run サービスURL"
  value       = google_cloud_run_v2_service.app.uri
}

output "artifact_registry" {
  description = "Docker イメージのプッシュ先"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/medical-form/app"
}

output "deploy_commands" {
  description = "イメージビルド＆デプロイコマンド"
  value       = <<-EOT
    # Dockerイメージビルド＆プッシュ
    docker build -t ${var.region}-docker.pkg.dev/${var.project_id}/medical-form/app:latest .
    docker push ${var.region}-docker.pkg.dev/${var.project_id}/medical-form/app:latest

    # Cloud Runを最新イメージに更新
    gcloud run services update medical-form --region=${var.region} --image=${var.region}-docker.pkg.dev/${var.project_id}/medical-form/app:latest
  EOT
}

output "wif_provider" {
  description = "Workload Identity Federation プロバイダー (GitHub Actions用)"
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "github_actions_sa" {
  description = "GitHub Actions サービスアカウント"
  value       = google_service_account.github_actions.email
}
