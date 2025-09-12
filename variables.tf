variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "cortex_api_token" {
  description = "Cortex API token with 'Edit plugins' permission"
  type        = string
  sensitive   = true
}

variable "plugin_tag" {
  description = "Unique tag for the plugin"
  type        = string
  default     = "spacelift-infrastructure"
}

variable "plugin_name" {
  description = "Display name for the plugin"
  type        = string
  default     = "Spacelift Infrastructure"
}

variable "plugin_description" {
  description = "Description of the plugin"
  type        = string
  default     = "Spacelift infrastructure dashboard showing stacks, health metrics, and management capabilities"
}

variable "minimum_role_required" {
  description = "Minimum role required to view the plugin"
  type        = string
  default     = "VIEWER"

  validation {
    condition     = contains(["VIEWER", "EDITOR", "ADMIN"], var.minimum_role_required)
    error_message = "Minimum role must be one of: VIEWER, EDITOR, ADMIN"
  }
}

variable "is_draft" {
  description = "Whether the plugin is a draft (not generally available)"
  type        = bool
  default     = false
}

variable "spacelift_endpoint" {
  description = "Spacelift endpoint URL (e.g., https://yourorg.app.spacelift.io)"
  type        = string
}

variable "spacelift_key_id" {
  description = "Spacelift API Key ID"
  type        = string
  sensitive   = true
}

variable "spacelift_key_secret" {
  description = "Spacelift API Key Secret"
  type        = string
  sensitive   = true
}

variable "proxy_path" {
  description = "Tag to identify the proxy configuration"
  type        = string
  default     = null
}
