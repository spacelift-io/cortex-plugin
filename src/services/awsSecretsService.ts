import { CortexApi } from '@cortexapps/plugin-core';

interface AWSSecretsConfig {
  region?: string;
  apiGatewayUrl?: string; // Optional API Gateway endpoint for simplified auth
}

export class AWSSecretsService {
  private region: string;
  private apiGatewayUrl?: string;

  constructor() {
    this.region = 'us-east-1';
  }

  async initialize(config: AWSSecretsConfig) {
    this.region = config.region || 'us-east-1';
    this.apiGatewayUrl = config.apiGatewayUrl;
  }

  async getSecret(secretId: string): Promise<any> {
    try {
      if (this.apiGatewayUrl) {
        // Use API Gateway endpoint (simpler authentication)
        return await this.getSecretViaApiGateway(secretId);
      } else {
        // Use direct AWS Secrets Manager API (requires AWS auth headers in proxy)
        return await this.getSecretDirectly(secretId);
      }
    } catch (error) {
      throw new Error(`Failed to retrieve secret: ${error}`);
    }
  }

  private async getSecretViaApiGateway(secretId: string): Promise<any> {
    const response = await CortexApi.proxyFetch(`${this.apiGatewayUrl}?secretName=${encodeURIComponent(secretId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API Gateway HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  private async getSecretDirectly(secretId: string): Promise<any> {
    // Use Cortex proxy to make AWS Secrets Manager API call
    const response = await CortexApi.proxyFetch(`https://secretsmanager.${this.region}.amazonaws.com/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'secretsmanager.GetSecretValue'
      },
      body: JSON.stringify({
        SecretId: secretId
      }),
    });

    if (!response.ok) {
      throw new Error(`AWS API HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.SecretString) {
      return JSON.parse(data.SecretString);
    } else {
      throw new Error('Secret not found or is binary (not supported)');
    }
  }
}