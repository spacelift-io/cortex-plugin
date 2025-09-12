import { SpaceStack, StackMetrics } from '../types/spacelift';
import { CortexApi } from '@cortexapps/plugin-core';

interface SpacePluginConfig {
  spaceliftEndpoint: string;
  apiToken: string;
}

export class SpaceliftService {
  private config: SpacePluginConfig | null = null;

  initialize(config: SpacePluginConfig) {
    this.config = config;
  }

  private jwtToken: string | null = null;

  private async getJwtToken(): Promise<string> {
    if (this.jwtToken) {
      return this.jwtToken;
    }

    if (!this.config?.apiToken) {
      throw new Error('Spacelift JWT token not configured. Please check your authentication setup.');
    }

    // Use the JWT token from Lambda
    this.jwtToken = this.config.apiToken;
    return this.jwtToken;
  }

  private async makeGraphQLRequest(query: string, variables?: any): Promise<any> {
    // Get JWT token first
    const token = await this.getJwtToken();

    // Use CortexApi.proxyFetch for all GraphQL requests to avoid CORS issues
    // @ts-ignore
    const response = await CortexApi.proxyFetch(`${this.config.spaceliftEndpoint}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ query, variables: variables || {} }),
    });

    if (!response.ok) {
      // If token expired, clear it and retry once
      if (response.status === 401 && this.jwtToken) {
        this.jwtToken = null;
        return this.makeGraphQLRequest(query, variables);
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  async getAllStacks(): Promise<SpaceStack[]> {
    // Use correct Spacelift API query structure
    const query = `
      query GetAllStacks {
        stacks {
          id
          name
          description
          state
          autodeploy
          administrative
          repository
          branch
          space
          labels
        }
      }
    `;

    try {
      const result = await this.makeGraphQLRequest(query);
      return result.data.stacks;
    } catch (error) {
      console.error('Error fetching all stacks:', error);
      throw error;
    }
  }

  async getStackMetrics(stackId: string): Promise<StackMetrics> {
    const query = `
      query GetStackMetrics($stackId: ID!) {
        stack(id: $stackId) {
          runs {
            id
            state
            createdAt
            updatedAt
            finished
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
            type
          }
        }
      }
    `;

    try {
      const result = await this.makeGraphQLRequest(query, { stackId });

      if (!result.data.stack) {
        throw new Error(`Stack ${stackId} not found`);
      }

      const runs = result.data.stack.runs || [];
      const entities = result.data.stack.entities || [];

      return this.calculateStackMetrics(runs, entities);
    } catch (error) {
      console.error('Error fetching stack metrics:', error);
      throw error;
    }
  }

  async triggerRun(stackId: string): Promise<string | null> {
    // Use direct GraphQL API calls with JWT token
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
  private calculateStackMetrics(runs: any[], entities: any[]): StackMetrics {
    // Sort runs by creation time (most recent first)
    const sortedRuns = runs.sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const totalRuns = sortedRuns.length;
    const successfulRuns = sortedRuns.filter((run: any) => run.state === 'FINISHED').length;
    const failedRuns = sortedRuns.filter((run: any) => run.state === 'FAILED').length;
    const lastRun = sortedRuns[0];
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

  // Method to get all stacks with metrics - fetches real metrics for each stack
  async getAllStacksWithMetrics(): Promise<{ stacks: SpaceStack[], metrics: Record<string, StackMetrics> }> {
    // First get all stacks
    const stacks = await this.getAllStacks();

    // Fetch metrics for each stack in parallel
    const metricsPromises = stacks.map(async (stack: any) => {
      try {
        const metrics = await this.getStackMetrics(stack.id);
        return { stackId: stack.id, metrics };
      } catch (error) {
        console.error(`Error fetching metrics for stack ${stack.id}:`, error);
        // Return empty metrics for failed stacks so the UI still works
        return {
          stackId: stack.id,
          metrics: {
            totalRuns: 0,
            successfulRuns: 0,
            failedRuns: 0,
            lastRunState: 'UNKNOWN',
            lastRunTime: undefined,
            lastTriggeredBy: undefined,
            driftDetected: false,
            resourceCount: 0,
          }
        };
      }
    });

    // Wait for all metrics to be fetched
    const metricsResults = await Promise.all(metricsPromises);

    // Convert to metrics map
    const metrics: Record<string, StackMetrics> = {};
    metricsResults.forEach(({ stackId, metrics: stackMetrics }) => {
      metrics[stackId] = stackMetrics;
    });

    return { stacks, metrics };
  }
}
