# Spacelift Lambda Authentication Setup for Cortex Plugin

## Overview

This plugin uses a Lambda-based authentication approach that simplifies credential management and eliminates complex AWS Signature V4 requirements for Cortex proxies.

## Architecture

```
Cortex Plugin -> Cortex Proxy -> Lambda Function -> JWT Token -> Direct Spacelift API
```

## Prerequisites

1. AWS account with Lambda and API Gateway access
2. Spacelift API credentials (API Key ID and Secret)
3. Terraform installed
4. AWS CLI configured

## Setup Steps

### 1. Deploy the Lambda Function

```bash
cd spacelift-auth-lambda
./deploy.sh
```

This creates:
- Lambda function that generates Spacelift JWT tokens
- API Gateway endpoint for the Lambda
- All necessary IAM roles and permissions

### 2. Note the API Gateway URL

After deployment, copy the API Gateway URL from the Terraform output:
```
https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/auth
```

### 3. Configure Cortex Proxy

Set up a Cortex proxy with the following configuration:

```yaml
proxy:
  url_pattern: "https://your-api-gateway-id.execute-api.us-east-1.amazonaws.com/prod/auth"
  headers:
    x-spacelift-key-id: "YOUR_SPACELIFT_API_KEY_ID"
    x-spacelift-key-secret: "YOUR_SPACELIFT_API_KEY_SECRET"  
    x-spacelift-endpoint: "https://YOUR-ACCOUNT.app.spacelift.io"
```

### 4. Update Plugin Configuration

**Option A: Environment Variable (Recommended)**
```bash
export SPACELIFT_AUTH_LAMBDA_URL=https://your-api-gateway-id.execute-api.us-east-1.amazonaws.com/prod/auth
npm run build
```

**Option B: Direct Code Update**
In `src/components/SpaceliftPlugin.tsx`, replace the placeholder URL:
```typescript
const lambdaUrl = process.env.SPACELIFT_AUTH_LAMBDA_URL || 'https://your-actual-api-gateway-id.execute-api.us-east-1.amazonaws.com/prod/auth';
```

## How It Works

### Production Flow
1. **Plugin calls Lambda**: Via Cortex proxy to get JWT token
2. **Lambda generates JWT**: Using Spacelift credentials from headers
3. **Plugin uses JWT**: Makes direct calls to Spacelift GraphQL API with Bearer token
4. **No proxy needed**: For Spacelift API calls - they're direct with JWT authentication

### Development Flow
1. **Environment variables**: Used for Spacelift credentials
2. **Direct API calls**: Plugin exchanges API key/secret for JWT directly with Spacelift
3. **Same GraphQL calls**: Uses the same queries but with direct fetch instead of proxy

## Benefits

✅ **Simple Cortex proxy config**: Only need to inject headers, no complex AWS signing  
✅ **Secure credential storage**: Credentials stored in Cortex secrets, not code  
✅ **Direct API performance**: No proxy overhead for GraphQL calls  
✅ **Stateless Lambda**: No credential storage, generates tokens on-demand  
✅ **Cost effective**: Minimal Lambda/API Gateway usage  

## Security

- **No credential storage**: Lambda is stateless, doesn't store credentials
- **Short-lived tokens**: JWT tokens have 1-hour expiration
- **Secure headers**: Spacelift credentials injected by Cortex proxy only
- **Direct API calls**: No additional proxy layer for sensitive GraphQL data

## Cost Estimation

For 10,000 plugin loads per month:
- **Lambda**: ~$0.10
- **API Gateway**: ~$0.035
- **Total**: **< $0.15/month**

## Troubleshooting

### Common Issues

1. **Lambda URL mismatch**: Ensure the URL in plugin matches Terraform output
2. **Header configuration**: Verify Cortex proxy headers match Lambda expectations
3. **CORS errors**: Lambda includes CORS headers, check browser developer tools
4. **Token expiration**: JWT tokens expire after 1 hour, plugin handles refresh

### Testing the Lambda

```bash
# Test directly with curl
curl -X POST https://your-api-gateway-url.amazonaws.com/prod/auth \
  -H "x-spacelift-key-id: your-api-key-id" \
  -H "x-spacelift-key-secret: your-api-key-secret" \
  -H "x-spacelift-endpoint: https://your-account.app.spacelift.io"
```

Expected response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "endpoint": "https://your-account.app.spacelift.io",
  "expiresIn": "1h"
}
```

### Debugging

1. **Check Lambda logs**:
   ```bash
   aws logs tail /aws/lambda/spacelift-auth-lambda --follow
   ```

2. **Test token validity**:
   ```bash
   # Use the token with Spacelift API
   curl -X POST https://your-account.app.spacelift.io/graphql \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"query": "{ viewer { user { id name } } }"}'
   ```

## Development Mode

For local development (outside Cortex):

1. **Environment variables** (`.env` file):
   ```
   SPACELIFT_ENDPOINT=https://your-account.app.spacelift.io
   SPACELIFT_API_KEY_ID=your-api-key-id
   SPACELIFT_API_KEY_SECRET=your-api-key-secret
   ```

2. **Direct API calls**: Plugin will use these credentials directly, bypassing Lambda

This approach maintains development simplicity while providing production security.