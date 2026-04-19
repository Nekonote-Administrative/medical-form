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

variable "gemini_api_key" {
  description = "Gemini API Key"
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

variable "enable_line_crm_notification" {
  description = "ヒアリングフォーム送信時に line-crm-worker へ通知するか"
  type        = bool
  default     = false
}

variable "line_crm_worker_url" {
  description = "line-crm-worker のベースURL (例: https://line-crm-worker.teramoto-4e9.workers.dev)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "line_crm_api_key" {
  description = "line-crm-worker の API_KEY (Bearer トークン)"
  type        = string
  default     = ""
  sensitive   = true
}
