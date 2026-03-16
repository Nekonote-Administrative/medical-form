resource "google_service_account" "cloud_run" {
  account_id   = "medical-form-run"
  display_name = "Medical Form Cloud Run Service Account"
}

resource "google_secret_manager_secret_iam_member" "cloud_run_access" {
  for_each  = local.all_secret_keys
  secret_id = google_secret_manager_secret.secrets[each.value].id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run.email}"
}

# 未認証アクセス許可（公開Webフォーム）
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
