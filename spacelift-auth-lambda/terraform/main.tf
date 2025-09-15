terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "function_name" {
  description = "Lambda function name"
  type        = string
  default     = "spacelift-auth-lambda"
}

variable "api_name" {
  description = "API Gateway name"
  type        = string
  default     = "spacelift-auth-api"
}

# Create deployment package
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../src"
  output_path = "${path.module}/../deployment.zip"
}

# IAM role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "${var.function_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# IAM policy attachment for basic Lambda execution
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_role.name
}

# Lambda function
resource "aws_lambda_function" "spacelift_auth" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = var.function_name
  role             = aws_iam_role.lambda_role.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.11"
  timeout          = 30
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      LOG_LEVEL = "INFO"
    }
  }

  tags = {
    Name        = var.function_name
    Environment = "production"
    Purpose     = "spacelift-auth"
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = 14
}

# API Gateway REST API
resource "aws_api_gateway_rest_api" "spacelift_auth_api" {
  name        = var.api_name
  description = "API for Spacelift authentication token generation"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name        = var.api_name
    Environment = "production"
    Purpose     = "spacelift-auth"
  }
}

# API Gateway Resource
resource "aws_api_gateway_resource" "auth_resource" {
  rest_api_id = aws_api_gateway_rest_api.spacelift_auth_api.id
  parent_id   = aws_api_gateway_rest_api.spacelift_auth_api.root_resource_id
  path_part   = "auth"
}

# API Gateway Method (POST)
resource "aws_api_gateway_method" "auth_post" {
  rest_api_id   = aws_api_gateway_rest_api.spacelift_auth_api.id
  resource_id   = aws_api_gateway_resource.auth_resource.id
  http_method   = "POST"
  authorization = "NONE"

  request_parameters = {
    "method.request.header.x-spacelift-key-id"     = true
    "method.request.header.x-spacelift-key-secret" = true
    "method.request.header.x-spacelift-endpoint"   = true
  }
}

# API Gateway Method (OPTIONS for CORS)
resource "aws_api_gateway_method" "auth_options" {
  rest_api_id   = aws_api_gateway_rest_api.spacelift_auth_api.id
  resource_id   = aws_api_gateway_resource.auth_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# API Gateway Integration (POST)
resource "aws_api_gateway_integration" "auth_integration" {
  rest_api_id = aws_api_gateway_rest_api.spacelift_auth_api.id
  resource_id = aws_api_gateway_resource.auth_resource.id
  http_method = aws_api_gateway_method.auth_post.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.spacelift_auth.invoke_arn
}

# API Gateway Integration (OPTIONS for CORS)
resource "aws_api_gateway_integration" "auth_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.spacelift_auth_api.id
  resource_id = aws_api_gateway_resource.auth_resource.id
  http_method = aws_api_gateway_method.auth_options.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# API Gateway Method Response (POST)
resource "aws_api_gateway_method_response" "auth_response" {
  rest_api_id = aws_api_gateway_rest_api.spacelift_auth_api.id
  resource_id = aws_api_gateway_resource.auth_resource.id
  http_method = aws_api_gateway_method.auth_post.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

# API Gateway Method Response (OPTIONS)
resource "aws_api_gateway_method_response" "auth_options_response" {
  rest_api_id = aws_api_gateway_rest_api.spacelift_auth_api.id
  resource_id = aws_api_gateway_resource.auth_resource.id
  http_method = aws_api_gateway_method.auth_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

# API Gateway Integration Response (OPTIONS)
resource "aws_api_gateway_integration_response" "auth_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.spacelift_auth_api.id
  resource_id = aws_api_gateway_resource.auth_resource.id
  http_method = aws_api_gateway_method.auth_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'https://spacelift.io'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,x-spacelift-key-id,x-spacelift-key-secret,x-spacelift-endpoint'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
  }

  depends_on = [aws_api_gateway_integration.auth_options_integration]
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway_invoke" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.spacelift_auth.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.spacelift_auth_api.execution_arn}/*/*"
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "spacelift_auth_deployment" {
  depends_on = [
    aws_api_gateway_method.auth_post,
    aws_api_gateway_method.auth_options,
    aws_api_gateway_integration.auth_integration,
    aws_api_gateway_integration.auth_options_integration,
  ]

  rest_api_id = aws_api_gateway_rest_api.spacelift_auth_api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.auth_resource.id,
      aws_api_gateway_method.auth_post.id,
      aws_api_gateway_method.auth_options.id,
      aws_api_gateway_integration.auth_integration.id,
      aws_api_gateway_integration.auth_options_integration.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway Stage
resource "aws_api_gateway_stage" "spacelift_auth_stage" {
  deployment_id = aws_api_gateway_deployment.spacelift_auth_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.spacelift_auth_api.id
  stage_name    = "prod"
}

# Outputs
output "api_gateway_url" {
  description = "API Gateway URL"
  value       = "${aws_api_gateway_rest_api.spacelift_auth_api.execution_arn}/${aws_api_gateway_stage.spacelift_auth_stage.stage_name}/auth"
}

output "api_gateway_invoke_url" {
  description = "API Gateway Invoke URL"
  value       = "https://${aws_api_gateway_rest_api.spacelift_auth_api.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_api_gateway_stage.spacelift_auth_stage.stage_name}/auth"
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.spacelift_auth.function_name
}

output "lambda_function_arn" {
  description = "Lambda function ARN"
  value       = aws_lambda_function.spacelift_auth.arn
}
