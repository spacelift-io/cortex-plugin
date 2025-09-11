# Spacelift Auth Lambda

A simple AWS Lambda function that generates JWT tokens for Spacelift GraphQL API authentication. This eliminates the need for complex AWS Signature V4 authentication in Cortex proxies.

## Architecture

```
Cortex Plugin -> Cortex Proxy -> API Gateway -> Lambda -> JWT Token
```

The Lambda function:
1. Receives Spacelift credentials via headers
2. Generates a JWT token for Spacelift API authentication  
3. Returns the token that can be used directly with Spacelift GraphQL API

## Files Structure

```
spacelift-auth-lambda/
├── src/
│   ├── lambda_function.py    # Main Lambda function
│   └── requirements.txt      # Python dependencies (none needed)
├── terraform/
│   └── main.tf              # Complete infrastructure setup
├── deploy.sh                # Deployment script
└── README.md               # This file
```

## Deployment

### Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform installed
- IAM permissions for Lambda, API Gateway, CloudWatch, and IAM

### Quick Deploy

```bash
./deploy.sh
```

### Manual Deploy

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

## Usage

### API Endpoint

After deployment, you'll get an API Gateway URL like:
```
https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/auth
```

### Request Format

```bash
curl -X POST https://your-api-gateway-url.amazonaws.com/prod/auth \
  -H "x-spacelift-key-id: your-api-key-id" \
  -H "x-spacelift-key-secret: your-api-key-secret" \
  -H "x-spacelift-endpoint: https://your-account.app.spacelift.io"
```

### Response Format

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "endpoint": "https://your-account.app.spacelift.io", 
  "expiresIn": "1h"
}
```

## Cortex Integration

### 1. Configure Cortex Proxy

Set up a Cortex proxy with the following configuration:

```yaml
proxy:
  url_pattern: "https://your-api-gateway-id.execute-api.us-east-1.amazonaws.com/prod/auth"
  headers:
    x-spacelift-key-id: "YOUR_SPACELIFT_API_KEY_ID"
    x-spacelift-key-secret: "YOUR_SPACELIFT_API_KEY_SECRET"  
    x-spacelift-endpoint: "https://YOUR-ACCOUNT.app.spacelift.io"
```

### 2. Update Plugin Code

```typescript
// Get token from Lambda
const response = await CortexApi.proxyFetch('https://your-api-gateway-url.amazonaws.com/prod/auth', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
});

const authData = await response.json();
const { token, endpoint } = authData;

// Use token for Spacelift GraphQL calls  
const spaceliftResponse = await fetch(`${endpoint}/graphql`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: '{ stacks { id name } }'
  })
});
```

## Security

- **No credentials stored**: Lambda function is stateless and doesn't store credentials
- **Short-lived tokens**: JWT tokens expire after 1 hour
- **CORS enabled**: Supports browser-based requests from Cortex
- **CloudWatch logging**: All requests are logged for monitoring

## Cost

- **Lambda**: ~$0.0000166 per request (first 1M requests free per month)
- **API Gateway**: ~$3.50 per million requests
- **CloudWatch**: Minimal logging costs

Estimated cost for 10,000 requests/month: **< $0.10**

## Cleanup

To remove all resources:

```bash
cd terraform
terraform destroy
```

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure AWS credentials have Lambda, API Gateway, and IAM permissions
2. **CORS Issues**: The Lambda includes CORS headers, but ensure your browser allows the requests
3. **Token Errors**: Check that Spacelift credentials are correct and have appropriate permissions

### Logs

View Lambda logs:
```bash
aws logs tail /aws/lambda/spacelift-auth-lambda --follow
```

### Testing

Test the Lambda directly:
```bash
aws lambda invoke \
  --function-name spacelift-auth-lambda \
  --payload '{"headers":{"x-spacelift-key-id":"test","x-spacelift-key-secret":"test","x-spacelift-endpoint":"https://test.app.spacelift.io"}}' \
  response.json
```