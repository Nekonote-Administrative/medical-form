variable "project_id" {
  description = "GCPプロジェクトID"
  type        = string
}

variable "region" {
  description = "デプロイリージョン"
  type        = string
  default     = "asia-northeast1"
}

variable "github_repo" {
  description = "GitHub リポジトリ (owner/repo)"
  type        = string
  default     = "Nekonote-Administrative/medical-form"
}

variable "google_maps_api_key" {
  description = "Google Maps API Key"
  type        = string
  sensitive   = true
}

variable "google_sheets_spreadsheet_id" {
  description = "Google Sheets テンプレートスプレッドシートID"
  type        = string
  sensitive   = true
}

variable "google_drive_parent_folder_id" {
  description = "Google Drive 親フォルダID"
  type        = string
  sensitive   = true
}

variable "google_service_account_email" {
  description = "Google サービスアカウントメールアドレス"
  type        = string
  sensitive   = true
}

variable "google_service_account_private_key" {
  description = "Google サービスアカウント秘密鍵"
  type        = string
  sensitive   = true
}

variable "anthropic_api_key" {
  description = "Anthropic API Key"
  type        = string
  sensitive   = true
}

variable "enable_google_calendar_staff" {
  description = "Google Calendar スタッフ設定を有効にするか"
  type        = bool
  default     = false
}

variable "google_calendar_staff" {
  description = "Google Calendar スタッフ設定 (JSON)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "enable_google_chat_webhook" {
  description = "Google Chat Webhook を有効にするか"
  type        = bool
  default     = false
}

variable "google_chat_webhook_url" {
  description = "Google Chat Webhook URL"
  type        = string
  default     = ""
  sensitive   = true
}
