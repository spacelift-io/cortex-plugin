import { SpaceliftAPI } from './spaceliftApi';
import { SpaceStack, StackMetrics } from '../types/spacelift';

interface SpacePluginConfig {
  spaceliftEndpoint: string;
  apiKeyId: string;
  apiKeySecret: string;
}

export class SpaceliftLocalService {
  private api: SpaceliftAPI;

  constructor(config: SpacePluginConfig) {
    // Use webpack proxy endpoint for local development
    const proxiedConfig = {
      ...config,
      spaceliftEndpoint: '/spacelift-api', // This will be proxied to actual Spacelift
    };
    this.api = new SpaceliftAPI(proxiedConfig);
  }

  async getAllStacks(): Promise<SpaceStack[]> {
    return this.api.getAllStacks();
  }

  async getStackMetrics(stackId: string): Promise<StackMetrics> {
    return this.api.getStackMetrics(stackId);
  }

  async triggerRun(stackId: string, message?: string): Promise<string | null> {
    return this.api.triggerRun(stackId, message);
  }

  async getAllStacksWithMetrics(): Promise<{ stacks: SpaceStack[], metrics: Record<string, StackMetrics> }> {
    return this.api.getAllStacksWithMetrics();
  }
}