#!/bin/bash

# Spacelift Auth Lambda Deployment Script
set -e

echo "🚀 Deploying Spacelift Auth Lambda..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if OpenTofu is installed
if ! command -v tofu &> /dev/null; then
    echo "❌ OpenTofu is not installed. Please install it first."
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run 'aws configure' first."
    exit 1
fi

# Navigate to terraform directory
cd terraform

echo "📦 Initializing OpenTofu..."
tofu init

echo "📋 Planning OpenTofu deployment..."
tofu plan

echo ""
echo "🤔 Do you want to proceed with the deployment? (y/N)"
read -r response
if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "❌ Deployment cancelled."
    exit 0
fi

echo "🎯 Applying OpenTofu configuration..."
tofu apply -auto-approve

echo "✅ Deployment complete!"
echo ""
echo "📝 Outputs:"
tofu output

echo ""
echo "🔧 Next steps:"
echo "1. Copy the API Gateway Invoke URL from the output above"
echo "2. Update your Cortex plugin configuration to use this endpoint"
echo "3. Configure Cortex proxy headers with your Spacelift credentials"