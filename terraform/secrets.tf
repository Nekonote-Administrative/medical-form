locals {
  required_secret_keys = toset([
    "google-maps-api-key",
    "google-sheets-spreadsheet-id",
    "google-drive-parent-folder-id",
    "google-service-account-email",
    "google-service-account-private-key",
    "anthropic-api-key",
  ])

  optional_secret_keys = toset(concat(
    var.enable_google_calendar_staff ? ["google-calendar-staff"] : [],
    var.enable_google_chat_webhook ? ["google-chat-webhook-url"] : [],
  ))

  all_secret_keys = setunion(local.required_secret_keys, local.optional_secret_keys)

  secret_values = {
    "google-maps-api-key"                = var.google_maps_api_key
    "google-sheets-spreadsheet-id"       = var.google_sheets_spreadsheet_id
    "google-drive-parent-folder-id"      = var.google_drive_parent_folder_id
    "google-service-account-email"       = var.google_service_account_email
    "google-service-account-private-key" = var.google_service_account_private_key
    "anthropic-api-key"                  = var.anthropic_api_key
    "google-calendar-staff"              = var.google_calendar_staff
    "google-chat-webhook-url"            = var.google_chat_webhook_url
  }
}

resource "google_secret_manager_secret" "secrets" {
  for_each  = local.all_secret_keys
  secret_id = each.value

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "secrets" {
  for_each    = local.all_secret_keys
  secret      = google_secret_manager_secret.secrets[each.value].id
  secret_data = local.secret_values[each.value]
}
