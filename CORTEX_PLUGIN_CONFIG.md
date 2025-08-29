# Cortex Plugin Configuration Guide

This document explains how to configure and deploy the Spacelift plugin in Cortex.

## Step 1: Build the Plugin

1. Set up your development environment:
```bash
npm install
cp .env.example .env
```

2. Edit your `.env` file with real Spacelift credentials (for local testing):
```env
SPACELIFT_ENDPOINT=https://your-account.app.spacelift.io
SPACELIFT_API_KEY_ID=your-api-key-id-here
SPACELIFT_API_KEY_SECRET=your-api-key-secret-here
```

3. Test locally (optional):
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

This creates a `dist/index.html` file that you'll upload to Cortex.

**Note**: The plugin no longer uses mock data. All API calls will be made to your actual Spacelift instance.

## Step 2: Create Plugin in Cortex

1. Log into your Cortex workspace
2. Navigate to **Settings** → **Plugins**
3. Click **Create Plugin**
4. Fill in the plugin details:
   - **Name**: Spacelift Integration
   - **Description**: Infrastructure deployment insights from Spacelift
   - **Type**: Custom Widget

## Step 3: Upload Plugin Code

1. Upload the `dist/index.html` file
2. Enable **Development Mode** for testing
3. Save the plugin

## Step 4: Configure Plugin Settings

Add the following configuration in the plugin settings:

### Basic Configuration

```json
{
  "spaceliftEndpoint": "https://your-account.app.spacelift.io",
  "apiKeyId": "01234567-89ab-cdef-0123-456789abcdef",
  "apiKeySecret": "your-secret-key-here",
  "view": "dashboard"
}
```

### Stack-Specific Configuration

```json
{
  "spaceliftEndpoint": "https://your-account.app.spacelift.io",
  "apiKeyId": "01234567-89ab-cdef-0123-456789abcdef",
  "apiKeySecret": "your-secret-key-here",
  "view": "stack-overview",
  "stackIds": ["my-service-stack"]
}
```

### Run History Configuration

```json
{
  "spaceliftEndpoint": "https://your-account.app.spacelift.io",
  "apiKeyId": "01234567-89ab-cdef-0123-456789abcdef",
  "apiKeySecret": "your-secret-key-here",
  "view": "run-history",
  "stackIds": ["my-service-stack"],
  "limit": 20
}
```

## Step 5: Configure Entity Metadata

You can associate stacks with specific services by adding metadata to your entity descriptors:

### Single Stack Association

```yaml
apiVersion: cortex/v1
kind: service
metadata:
  name: user-service
  x:
    spacelift:
      stackId: "user-service-production"
spec:
  # ... rest of your service definition
```

### Multiple Stack Association

```yaml
apiVersion: cortex/v1
kind: service
metadata:
  name: user-service
  x:
    spacelift:
      stacks: 
        - "user-service-staging"
        - "user-service-production"
        - "user-service-database"
spec:
  # ... rest of your service definition
```

## Step 6: Add Plugin to Pages

### Service Detail Page

1. Navigate to any service
2. Click **Edit** → **Plugins**
3. Add your Spacelift plugin
4. Configure the view type and position

### Dashboard/Homepage

1. Go to **Settings** → **Homepage**
2. Add a new widget
3. Select your Spacelift plugin
4. Configure for dashboard view

## Configuration Reference

### Plugin Config Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `spaceliftEndpoint` | string | Yes | Your Spacelift account URL |
| `apiKeyId` | string | Yes | Spacelift API key ID |
| `apiKeySecret` | string | Yes | Spacelift API key secret |
| `view` | string | No | View type: `dashboard`, `stack-overview`, `run-history` |
| `stackIds` | string[] | No | Specific stack IDs to display |
| `limit` | number | No | Number of runs to show (run-history view) |

### Entity Metadata Options

| Option | Type | Description |
|--------|------|-------------|
| `x.spacelift.stackId` | string | Single stack ID for this service |
| `x.spacelift.stacks` | string[] | Multiple stack IDs for this service |

## View Types Explained

### Dashboard View
- Best for: Homepage widgets, team overviews
- Shows: Multiple stacks with summary metrics
- Use when: You want to monitor many stacks at once

### Stack Overview View
- Best for: Service detail pages
- Shows: Detailed single stack information
- Use when: You want deep insights into one stack

### Run History View
- Best for: Service detail pages, deployment tracking
- Shows: Recent deployment history with details
- Use when: You need to track deployment activity

## Security Considerations

1. **API Key Permissions**: Use API keys with minimal required permissions
2. **Key Rotation**: Regularly rotate your Spacelift API keys
3. **Secret Management**: Consider using Cortex's secret management features
4. **Access Control**: Ensure only authorized users can view infrastructure data

## Troubleshooting

### Plugin Not Loading
- Verify the HTML file uploaded correctly
- Check browser console for JavaScript errors
- Ensure development mode is enabled during testing

### Authentication Errors
- Verify API key ID and secret are correct
- Check that the API key has required permissions
- Ensure the Spacelift endpoint URL is correct

### No Data Showing
- Verify stack IDs exist and are accessible
- Check that the API key can read the specified stacks
- Ensure network connectivity to Spacelift

### Stack Association Issues
- Verify entity metadata is properly formatted
- Check that stack IDs match exactly
- Ensure the entity has been saved and refreshed