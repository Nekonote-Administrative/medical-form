locals {
  # Secret Manager参照 → Cloud Run環境変数マッピング
  env_secret_map = {
    GOOGLE_MAPS_API_KEY              = "google-maps-api-key"
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY  = "google-maps-api-key"
    GOOGLE_SHEETS_SPREADSHEET_ID     = "google-sheets-spreadsheet-id"
    GOOGLE_DRIVE_PARENT_FOLDER_ID    = "google-drive-parent-folder-id"
    GOOGLE_SERVICE_ACCOUNT_EMAIL     = "google-service-account-email"
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = "google-service-account-private-key"
    ANTHROPIC_API_KEY                = "anthropic-api-key"
  }

  optional_env_secret_map = merge(
    var.enable_google_calendar_staff ? { GOOGLE_CALENDAR_STAFF = "google-calendar-staff" } : {},
    var.enable_google_chat_webhook ? { GOOGLE_CHAT_WEBHOOK_URL = "google-chat-webhook-url" } : {},
  )

  all_env_secret_map = merge(local.env_secret_map, local.optional_env_secret_map)
}

resource "google_cloud_run_v2_service" "app" {
  name                = "medical-form"
  location            = var.region
  deletion_protection = false

  template {
    service_account = google_service_account.cloud_run.email

    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/medical-form/app:latest"

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      dynamic "env" {
        for_each = local.all_env_secret_map
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.secrets[env.value].id
              version = "latest"
            }
          }
        }
      }
    }
  }

  depends_on = [
    google_project_service.apis,
    google_secret_manager_secret_version.secrets,
  ]
}
