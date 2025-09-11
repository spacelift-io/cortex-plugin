#!/bin/bash

# Test script for the Spacelift Auth Lambda API
API_URL="https://5wpvsa34tf.execute-api.us-east-1.amazonaws.com/prod/auth"

echo "🧪 Testing Spacelift Auth Lambda API..."
echo "URL: $API_URL"
echo ""

# Test with required headers
echo "📋 Testing with headers..."
curl -v -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-spacelift-key-id: test-key-id" \
  -H "x-spacelift-key-secret: test-key-secret" \
  -H "x-spacelift-endpoint: https://test.app.spacelift.io" \
  2>&1

echo ""
echo "📋 Testing without headers (should fail)..."
curl -v -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  2>&1

echo ""
echo "📋 Testing OPTIONS request (CORS preflight)..."
curl -v -X OPTIONS "$API_URL" \
  -H "Origin: https://app.getcortexapp.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,x-spacelift-key-id,x-spacelift-key-secret,x-spacelift-endpoint" \
  2>&1