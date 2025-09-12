# Spacelift Cortex Plugin Terraform Configuration

This Terraform configuration deploys the Spacelift plugin to Cortex using the REST API provider.

## What it does

1. **Builds the plugin** - Runs `npm run build` to create the `ui.html` file
2. **Creates secrets** - Stores Spacelift API credentials securely in Cortex
3. **Creates a proxy** - Sets up authentication proxy to inject Spacelift credentials
4. **Deploys the plugin** - Creates the plugin in Cortex with the built UI

## Prerequisites

- Terraform or OpenTofu installed
- Node.js and npm installed
- Cortex API token with 'Edit plugins' permission
- Spacelift API credentials (key ID and secret)
- Lambda function URL for Spacelift authentication

## Usage

1. **Copy the example variables file:**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit terraform.tfvars with your values:**
   ```hcl
   cortex_api_token = "your-cortex-api-token"
   spacelift_auth_lambda_url = "https://your-lambda-url.execute-api.region.amazonaws.com/prod/auth"
   spacelift_endpoint = "https://yourorg.app.spacelift.io"
   spacelift_key_id = "your-spacelift-key-id"
   spacelift_key_secret = "your-spacelift-key-secret"
   ```

3. **Initialize Terraform:**
   ```bash
   terraform init
   ```

4. **Plan the deployment:**
   ```bash
   terraform plan
   ```

5. **Apply the configuration:**
   ```bash
   terraform apply
   ```

## Configuration Options

### Plugin Settings
- `plugin_tag` - Unique identifier for the plugin
- `plugin_name` - Display name in Cortex
- `plugin_description` - Description text
- `plugin_contexts` - Where the plugin appears (default: `["ENTITY"]`)
- `minimum_role_required` - Minimum role to view plugin (`VIEWER`, `EDITOR`, `ADMIN`)
- `is_draft` - Whether plugin is generally available

### Cortex Settings  
- `cortex_api_url` - Cortex API base URL (default: `https://api.getcortex.com`)
- `cortex_api_token` - API token with 'Edit plugins' permission

### Spacelift Settings
- `spacelift_auth_lambda_url` - Lambda function URL for authentication
- `spacelift_endpoint` - Your Spacelift organization URL
- `spacelift_key_id` - Spacelift API key ID
- `spacelift_key_secret` - Spacelift API key secret

## How Authentication Works

1. Plugin makes requests using `CortexApi.proxyFetch()`
2. Requests are routed through the Cortex proxy
3. Proxy injects Spacelift credentials as headers:
   - `x-spacelift-endpoint`
   - `x-spacelift-key-id`
   - `x-spacelift-key-secret`
4. Lambda function uses these headers to authenticate with Spacelift
5. Lambda returns JWT token for direct Spacelift API calls

## Resources Created

- **Secrets**: Spacelift endpoint, key ID, and key secret
- **Proxy**: Authentication proxy with header injection rules
- **Plugin**: The UI plugin with associated proxy

## Cleanup

To remove all resources:
```bash
terraform destroy
```

## Troubleshooting

- Ensure your Cortex API token has 'Edit plugins' permission
- Verify the Lambda function URL is accessible and working
- Check that Spacelift API credentials are valid
- Plugin contexts must match where you want the plugin to appear