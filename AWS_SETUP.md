# AWS Secrets Manager Setup for Spacelift Plugin

## Prerequisites

1. AWS account with Secrets Manager access
2. Cortex plugin proxy configured for AWS Secrets Manager API calls
3. Spacelift API credentials (API Key ID and Secret)

## Setup Steps

### 1. Create AWS Secret

Create a secret in AWS Secrets Manager with the following JSON structure:

```json
{
  "spacelift_endpoint": "https://YOUR-ACCOUNT.app.spacelift.io",
  "spacelift_api_key_id": "your-spacelift-api-key-id",
  "spacelift_api_key_secret": "your-spacelift-api-key-secret"
}
```

**Secret Name**: `spacelift-credentials`
**Region**: `us-east-1` (or update the region in the plugin code)

### 2. Configure Cortex Proxy

The plugin uses `CortexApi.proxyFetch` to call AWS Secrets Manager API:
- **URL Pattern**: `https://secretsmanager.us-east-1.amazonaws.com/`
- **Method**: POST
- **Plugin Headers**: 
  - `Content-Type: application/x-amz-json-1.1`
  - `X-Amz-Target: secretsmanager.GetSecretValue`

**Cortex Proxy Configuration:**

Since Cortex proxies only allow header modification, you need to configure the proxy to inject AWS authentication headers:

```yaml
# Example Cortex proxy configuration
proxy:
  url_pattern: "https://secretsmanager.*.amazonaws.com/"
  headers:
    Authorization: "AWS4-HMAC-SHA256 Credential={ACCESS_KEY_ID}/20231201/us-east-1/secretsmanager/aws4_request, SignedHeaders=host;x-amz-date;x-amz-target, Signature={CALCULATED_SIGNATURE}"
    X-Amz-Date: "{CURRENT_TIMESTAMP}"
    X-Amz-Security-Token: "{SESSION_TOKEN}"  # If using IAM roles
```

**Reality Check - AWS Authentication Requirements:**

AWS APIs **only** accept properly signed requests using AWS Signature Version 4. There are no "simple" header alternatives. The Authorization header must contain:
- Credential scope (access key, date, region, service)
- Signed headers list
- Calculated signature based on request content

**This means:**
- Cortex proxy must implement AWS Signature V4 signing logic
- OR use the API Gateway approach (recommended)

**Note**: The exact header configuration depends on your Cortex deployment's proxy capabilities. AWS API calls typically require Signature V4 authentication, which involves calculating a signature based on the request content, timestamp, and AWS credentials.

**Recommended Solution - API Gateway Proxy:**

Since AWS Signature V4 signing is complex and requires calculating signatures based on request content, the **strongly recommended** approach is to create a simple AWS API Gateway endpoint that:

1. Accepts the secret name as a parameter
2. Uses IAM authentication (handled by API Gateway)  
3. Calls AWS Secrets Manager internally
4. Returns the secret value

Then configure Cortex proxy for your API Gateway URL instead:

```yaml
proxy:
  url_pattern: "https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/get-secret"
  headers:
    x-api-key: "{YOUR_API_GATEWAY_API_KEY}"
```

Plugin would then call:
```javascript
const response = await CortexApi.proxyFetch('https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/get-secret?secretName=spacelift-credentials', {
  method: 'GET'
});
```

This approach moves the AWS authentication complexity to API Gateway, which handles it natively.

## Why Direct AWS API Calls Are Challenging

AWS Signature Version 4 requires:

1. **Dynamic signature calculation** based on:
   - HTTP method, URL, headers, body content
   - Current timestamp (within 15 minutes)
   - AWS credentials and region

2. **Header dependencies**:
   - `Authorization` header depends on other headers (`X-Amz-Date`, `Host`, etc.)
   - Signature must be calculated after all headers are finalized

3. **Static header limitations**:
   - Cortex proxies typically use static header injection
   - Cannot dynamically calculate signatures at request time

**Example of what AWS expects:**
```
Authorization: AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20220830/us-east-1/secretsmanager/aws4_request,SignedHeaders=host;x-amz-date;x-amz-target,Signature=calculated_signature_here
X-Amz-Date: 20220830T123600Z
```

The signature calculation involves HMAC-SHA256 operations on the request details - not feasible with static headers.

### 3. IAM Permissions

The AWS credentials used by Cortex proxy need the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:ACCOUNT-ID:secret:spacelift-credentials*"
    }
  ]
}
```

## Development Mode

For development (outside Cortex iframe), the plugin uses environment variables:
- `SPACELIFT_ENDPOINT`
- `SPACELIFT_API_KEY_ID`  
- `SPACELIFT_API_KEY_SECRET`

Create a `.env` file in the project root with these values for local development.

## Production Mode

In production (running within Cortex), the plugin:
1. Detects it's running in an iframe (`window !== window.top`)
2. Uses `CortexApi.proxyFetch` to call AWS Secrets Manager
3. Retrieves Spacelift credentials from the secret
4. Uses those credentials to authenticate with Spacelift API

## Architecture

```
Cortex Plugin -> CortexApi.proxyFetch -> Cortex Backend -> AWS Secrets Manager API
                                              ↓
                                        AWS IAM Authentication
```

The plugin never handles AWS credentials directly - they are managed by the Cortex backend proxy system.