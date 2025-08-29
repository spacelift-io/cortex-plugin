import { CortexApi } from '@cortexapps/plugin-core';
import { SpaceliftLocalService } from './spaceliftLocalService';
import { SpaceStack, StackMetrics } from '../types/spacelift';

interface SpacePluginConfig {
  spaceliftEndpoint: string;
  apiKeyId: string;
  apiKeySecret: string;
}

export class SpaceliftService {
  private config: SpacePluginConfig | null = null;
  private isProduction: boolean;
  private localService: SpaceliftLocalService | null = null;

  constructor() {
    // Detect environment
    this.isProduction = !(
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1'
    );
  }

  initialize(config: SpacePluginConfig) {
    this.config = config;
    
    if (!this.isProduction) {
      // Initialize local service for development
      this.localService = new SpaceliftLocalService(config);
    }
  }

  private async makeGraphQLRequest(query: string, variables?: any): Promise<any> {
    // This method is now only used in production mode
    // Development uses the localService instead
    const response = await CortexApi.proxyFetch('/api/spacelift/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: variables || {} }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  async getAllStacks(): Promise<SpaceStack[]> {
    if (!this.isProduction && this.localService) {
      // Development: use local service with direct API calls
      return this.localService.getAllStacks();
    }

    // Production: use Cortex backend proxy
    const query = `
      query GetAllStacks($first: Int!) {
        stacks(first: $first) {
          edges {
            node {
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
              space {
                id
              }
              labels
              entities {
                id
                name
                type
              }
            }
          }
        }
      }
    `;

    try {
      const result = await this.makeGraphQLRequest(query, { first: 100 });
      return result.data.stacks.edges.map((edge: any) => edge.node);
    } catch (error) {
      console.error('Error fetching all stacks:', error);
      throw error;
    }
  }

  async getStackMetrics(stackId: string): Promise<StackMetrics> {
    if (!this.isProduction && this.localService) {
      // Development: use local service with direct API calls
      return this.localService.getStackMetrics(stackId);
    }

    // Production: use Cortex backend proxy
    const runsQuery = `
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
          entities {
            id
            name
            type
          }
        }
      }
    `;

    try {
      const result = await this.makeGraphQLRequest(runsQuery, { stack: stackId });
      const runs = (result.data.stack.runs || []).slice(0, 50);
      const entities = result.data.stack.entities || [];

      const totalRuns = runs.length;
      const successfulRuns = runs.filter((run: any) => run.state === 'FINISHED').length;
      const failedRuns = runs.filter((run: any) => run.state === 'FAILED').length;
      const lastRun = runs[0];

      // Count resources from stack entities
      const resourceCount = entities.length;

      return {
        totalRuns,
        successfulRuns,
        failedRuns,
        lastRunState: lastRun?.state || 'UNKNOWN',
        lastRunTime: lastRun?.updatedAt,
        driftDetected: false, // Would need additional query for drift detection
        resourceCount,
      };
    } catch (error) {
      console.error('Error fetching stack metrics:', error);
      throw error;
    }
  }

  async triggerRun(stackId: string, message?: string): Promise<string | null> {
    if (!this.isProduction && this.localService) {
      // Development: use local service with direct API calls
      return this.localService.triggerRun(stackId, message);
    }

    // Production: use Cortex backend proxy
    const mutation = `
      mutation TriggerRun($stack: ID!) {
        runTrigger(stack: $stack) {
          id
        }
      }
    `;

    try {
      const result = await this.makeGraphQLRequest(mutation, { 
        stack: stackId
      });
      return result.data.runTrigger.id;
    } catch (error) {
      console.error('Error triggering run:', error);
      throw error;
    }
  }

  // Helper method to calculate metrics from stack data
  private calculateStackMetrics(stack: any, runs: any[], entities: any[]): StackMetrics {
    const totalRuns = runs.length;
    const successfulRuns = runs.filter((run: any) => run.state === 'FINISHED').length;
    const failedRuns = runs.filter((run: any) => run.state === 'FAILED').length;
    const lastRun = runs[0];
    const resourceCount = entities.length;

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

  // Optimized method to get all stacks with metrics in a single query
  async getAllStacksWithMetrics(): Promise<{ stacks: SpaceStack[], metrics: Record<string, StackMetrics> }> {
    if (!this.isProduction && this.localService) {
      // Development: use local service with direct API calls
      return this.localService.getAllStacksWithMetrics();
    }

    // Production: use Cortex backend proxy - get all data in one query
    const query = `
      query GetAllStacksWithMetrics($first: Int!) {
        stacks(first: $first) {
          edges {
            node {
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
              space {
                id
              }
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
        }
      }
    `;

    try {
      const result = await this.makeGraphQLRequest(query, { first: 100 });
      const stacks = result.data.stacks.edges.map((edge: any) => edge.node);
      const metrics: Record<string, StackMetrics> = {};
      
      stacks.forEach((stack: any) => {
        const runs = (stack.runs || []).slice(0, 50);
        const entities = stack.entities || [];
        metrics[stack.id] = this.calculateStackMetrics(stack, runs, entities);
      });

      return { stacks, metrics };
    } catch (error) {
      console.error('Error fetching all stacks with metrics:', error);
      throw error;
    }
  }
}