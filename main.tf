terraform {
  required_providers {
    restapi = {
      source  = "Mastercard/restapi"
      version = "~> 1.18"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

provider "restapi" {
  uri                  = "https://api.getcortexapp.com"
  write_returns_object = true

  id_attribute = "tag"

  headers = {
    Authorization = "Bearer ${var.cortex_api_token}"
    Content-Type  = "application/json"
  }
}

module "spacelift_auth_lambda" {
  source = "./spacelift-auth-lambda/terraform"

  aws_region    = var.aws_region
  function_name = "${var.plugin_tag}_spacelift_cortex_auth"
  api_name      = "${var.plugin_tag}_spacelift_cortex_auth"
}

resource "local_file" "tf_build_consts" {
  filename = "/tmp/TF_build_consts.tsx.real"
  content  = <<EOT
const SPACELIFT_AUTH_LAMBDA_URL = "${module.spacelift_auth_lambda.api_gateway_invoke_url}";
export default SPACELIFT_AUTH_LAMBDA_URL;
EOT
}

# Build the plugin UI
resource "null_resource" "build_plugin" {
  # Rebuild when source files change
  triggers = {
    # Monitor key source files for changes
    package_json   = filemd5("${path.module}/package.json")
    webpack_config = filemd5("${path.module}/webpack.config.js")
    src_files = md5(join("", [
      for f in fileset("${path.module}/src", "**/*.{ts,tsx,jsx,css}")
      : filemd5("${path.module}/src/${f}")
    ]))
  }

  provisioner "local-exec" {
    working_dir = "${path.module}/src"
    command     = "npm install && npm run tf_copy_real && npm run build && npm run tf_copy_backup"
  }

  depends_on = [local_file.tf_build_consts]
}

# Read the built UI file
data "local_file" "ui_html" {
  filename   = "${path.module}/dist/ui.html"
  depends_on = [null_resource.build_plugin]
}

resource "restapi_object" "spacelift_key_id_secret" {
  path = "/api/v1/secrets"

  data = jsonencode({
    name   = "${var.plugin_tag}_spacelift_key_id"
    tag    = "${var.plugin_tag}_spacelift_key_id"
    secret = var.spacelift_key_id
  })
}

resource "restapi_object" "spacelift_key_secret_secret" {
  path = "/api/v1/secrets"

  data = jsonencode({
    name   = "${var.plugin_tag}_spacelift_key_secret"
    tag    = "${var.plugin_tag}_spacelift_key_secret"
    secret = var.spacelift_key_secret
  })
}

locals {
  key_id_tag     = jsondecode(restapi_object.spacelift_key_id_secret.api_response).tag
  key_secret_tag = jsondecode(restapi_object.spacelift_key_secret_secret.api_response).tag
}

locals {
  proxy = {
    "${module.spacelift_auth_lambda.api_gateway_invoke_url}" = {
      urlHeaders = [
        {
          name  = "x-spacelift-endpoint"
          value = var.spacelift_endpoint
        },
        {
          name  = "x-spacelift-key-id"
          value = "{{ secrets.${local.key_id_tag} }}"
        },
        {
          name  = "x-spacelift-key-secret"
          value = "{{ secrets.${local.key_secret_tag} }}"
        }
      ]
    },
    "${var.spacelift_endpoint}" = {
      urlHeaders = [
        {
          name  = "x-from-cortex"
          value = "true"
        }
      ]
    }
  }
}

output "proxy_configuration" {
  description = "Proxy configuration for Cortex plugin"
  value       = local.proxy
}

# Create the Cortex plugin
resource "restapi_object" "spacelift_plugin" {
  path  = "/api/v1/plugins"

  data = jsonencode({
    tag                 = var.plugin_tag
    name                = var.plugin_name
    description         = var.plugin_description
    blob                = data.local_file.ui_html.content
    contexts            = [{type = "GLOBAL"}]
    minimumRoleRequired = var.minimum_role_required
    isDraft             = var.is_draft
    proxyTag            = var.proxy_path
  })

  depends_on = [
    null_resource.build_plugin
  ]
}
