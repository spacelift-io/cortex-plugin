import axios, { AxiosInstance } from 'axios';
import { SpaceStack, SpaceRun, StackMetrics, SpacePluginConfig } from '../types/spacelift';

export class SpaceliftAPI {
  private config: SpacePluginConfig;
  private jwtToken: string | null = null;

  constructor(config: SpacePluginConfig) {
    this.config = config;
  }

  private async generateToken(): Promise<string> {
    if (this.jwtToken) {
      return this.jwtToken;
    }

    // First, get a JWT token using the apiKeyUser mutation
    // Based on Spacelift API docs, we need to select the jwt field from the User object
    const mutation = `
      mutation ApiKeyUser($id: ID!, $secret: String!) {
        apiKeyUser(id: $id, secret: $secret) {
          jwt
        }
      }
    `;

    try {
      // Create a temporary client without authorization for the token request
      const tokenClient = axios.create({
        baseURL: `${this.config.spaceliftEndpoint}/graphql`,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await tokenClient.post('', {
        query: mutation,
        variables: {
          id: this.config.apiKeyId,
          secret: this.config.apiKeySecret,
        },
      });

      if (response.data.errors) {
        throw new Error(`Token generation failed: ${response.data.errors[0].message}`);
      }

      const token = response.data.data.apiKeyUser.jwt;
      this.jwtToken = token;
      return token;
    } catch (error) {
      console.error('Error generating token:', error);
      throw error;
    }
  }

  private async getAuthenticatedClient(): Promise<AxiosInstance> {
    const token = await this.generateToken();
    
    return axios.create({
      baseURL: `${this.config.spaceliftEndpoint}/graphql`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async getStack(stackId: string): Promise<SpaceStack | null> {
    const query = `
      query GetStack($id: ID!) {
        stack(id: $id) {
          id
          name
          description
          state
          administrative
          autodeploy
          autoretry
          repository
          branch
          provider
          space
          labels
          entities {
            id
            name
            type
          }
        }
      }
    `;

    try {
      const client = await this.getAuthenticatedClient();
      const response = await client.post('', {
        query,
        variables: { id: stackId },
      });

      if (response.data.errors) {
        console.error('GraphQL errors:', response.data.errors);
        throw new Error(response.data.errors[0].message);
      }

      return response.data.data.stack;
    } catch (error) {
      console.error('Error fetching stack:', error);
      throw error;
    }
  }

  async getStackRuns(stackId: string, limit = 10): Promise<SpaceRun[]> {
    const query = `
      query GetStackRuns($stack: ID!) {
        stack(id: $stack) {
          runs {
            id
            state
            type
            createdAt
            updatedAt
            title
            triggeredBy
            commit {
              hash
              message
              authorName
              timestamp
            }
          }
        }
      }
    `;

    try {
      const client = await this.getAuthenticatedClient();
      const response = await client.post('', {
        query,
        variables: { stack: stackId },
      });

      if (response.data.errors) {
        console.error('GraphQL errors:', response.data.errors);
        throw new Error(response.data.errors[0].message);
      }

      const runs = response.data.data.stack.runs || [];
      return runs.slice(0, limit);
    } catch (error) {
      console.error('Error fetching stack runs:', error);
      throw error;
    }
  }

  async getStackMetrics(stackId: string): Promise<StackMetrics> {
    const runs = await this.getStackRuns(stackId, 50);
    const stack = await this.getStack(stackId);

    const totalRuns = runs.length;
    const successfulRuns = runs.filter(run => run.state === 'FINISHED').length;
    const failedRuns = runs.filter(run => run.state === 'FAILED').length;
    const lastRun = runs[0];

    // Count resources from stack entities
    const resourceCount = stack?.entities?.length || 0;

    return {
      totalRuns,
      successfulRuns,
      failedRuns,
      lastRunState: lastRun?.state || 'UNKNOWN',
      lastRunTime: lastRun?.updatedAt,
      lastTriggeredBy: lastRun?.triggeredBy,
      driftDetected: false,
      resourceCount,
    };
  }

  // Helper method to calculate metrics from stack data (used for optimized queries)
  calculateStackMetrics(stack: SpaceStack): StackMetrics {
    const runs = (stack.runs || []).slice(0, 50);
    const totalRuns = runs.length;
    const successfulRuns = runs.filter(run => run.state === 'FINISHED').length;
    const failedRuns = runs.filter(run => run.state === 'FAILED').length;
    const lastRun = runs[0];
    const resourceCount = stack.entities?.length || 0;

    return {
      totalRuns,
      successfulRuns,
      failedRuns,
      lastRunState: lastRun?.state || 'UNKNOWN',
      lastRunTime: lastRun?.updatedAt,
      lastTriggeredBy: lastRun?.triggeredBy,
      driftDetected: false,
      resourceCount,
    };
  }

  // Optimized method to get all stacks with their metrics in one call
  async getAllStacksWithMetrics(): Promise<{ stacks: SpaceStack[], metrics: Record<string, StackMetrics> }> {
    const stacks = await this.getAllStacks();
    const metrics: Record<string, StackMetrics> = {};
    
    stacks.forEach(stack => {
      metrics[stack.id] = this.calculateStackMetrics(stack);
    });

    return { stacks, metrics };
  }

  async triggerRun(stackId: string, message?: string): Promise<string | null> {
    const mutation = `
      mutation TriggerRun($stack: ID!) {
        runTrigger(stack: $stack) {
          id
        }
      }
    `;

    try {
      const client = await this.getAuthenticatedClient();
      const response = await client.post('', {
        query: mutation,
        variables: { stack: stackId },
      });

      if (response.data.errors) {
        console.error('GraphQL errors:', response.data.errors);
        throw new Error(response.data.errors[0].message);
      }

      return response.data.data.runTrigger.id;
    } catch (error) {
      console.error('Error triggering run:', error);
      throw error;
    }
  }

  async getAllStacks(): Promise<SpaceStack[]> {
    // Get all stacks with their runs and entities in a single optimized query
    const query = `
      query GetAllStacksWithMetrics {
        stacks {
          id
          name
          description
          state
          administrative
          autodeploy
          autoretry
          repository
          branch
          provider
          space
          labels
          entities {
            id
            name
            type
          }
          runs {
            id
            state
            type
            createdAt
            updatedAt
            title
            triggeredBy
            commit {
              hash
              message
              authorName
              timestamp
            }
          }
        }
      }
    `;

    try {
      const client = await this.getAuthenticatedClient();
      const response = await client.post('', {
        query,
        variables: {},
      });

      if (response.data.errors) {
        console.error('GraphQL errors:', response.data.errors);
        throw new Error(response.data.errors[0].message);
      }

      return response.data.data.stacks;
    } catch (error) {
      console.error('Error fetching all stacks:', error);
      throw error;
    }
  }
}