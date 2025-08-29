import React, { useState, useEffect } from 'react';
import { Badge, Button, Card } from '@cortexapps/react-plugin-ui';
import { CortexApi, CortexContextResponse } from '@cortexapps/plugin-core';
import { SpaceliftService } from '../services/spaceliftService';
import { SpaceStack, StackMetrics } from '../types/spacelift';
import './SpaceliftPlugin.css';

interface SpaceliftPluginConfig {
  spaceliftEndpoint: string;
  apiKeyId: string;
  apiKeySecret: string;
}

export const SpaceliftPlugin: React.FC = () => {
  const [context, setContext] = useState<CortexContextResponse | null>(null);
  const [config, setConfig] = useState<SpaceliftPluginConfig | null>(null);
  const [stacks, setStacks] = useState<SpaceStack[]>([]);
  const [stackMetrics, setStackMetrics] = useState<Record<string, StackMetrics>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spaceliftService] = useState(new SpaceliftService());

  // Initialize plugin and fetch context
  useEffect(() => {
    const initPlugin = async () => {
      // Check if we're running in development mode (outside of Cortex iframe)
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (isDevelopment) {
        // Development mode - use environment variables
        const spaceliftEndpoint = process.env.SPACELIFT_ENDPOINT;
        const apiKeyId = process.env.SPACELIFT_API_KEY_ID;
        const apiKeySecret = process.env.SPACELIFT_API_KEY_SECRET;


        // Validate required environment variables
        if (!spaceliftEndpoint || !apiKeyId || !apiKeySecret) {
          setError('Missing required environment variables. Please create a .env file with SPACELIFT_ENDPOINT, SPACELIFT_API_KEY_ID, and SPACELIFT_API_KEY_SECRET.');
          return;
        }

        // Initialize Cortex API even in development
        try {
          CortexApi.pluginInit();
        } catch (err) {
        }

        // Set mock context for development
        setContext({
          entity: {
            tag: 'dev-service',
            name: 'Development Service',
            type: 'service',
            definition: {}
          } as any,
          user: { email: 'dev@example.com', name: 'Developer' } as any,
          location: 'ENTITY' as any,
          style: {},
          theme: 'light',
          tag: 'dev',
          apiBaseUrl: 'http://localhost:3000'
        });
        
        // Set development configuration from environment variables
        setConfig({
          spaceliftEndpoint,
          apiKeyId,
          apiKeySecret,
        });
      } else {
        // Production mode - use real Cortex API
        try {
          CortexApi.pluginInit();
          const contextData = await CortexApi.getContext();
          setContext(contextData);
          
          // In production, configuration would come from plugin settings
          // For now, using mock config - replace with actual plugin configuration
          setConfig({
            spaceliftEndpoint: 'https://your-account.app.spacelift.io',
            apiKeyId: 'your-api-key-id',
            apiKeySecret: 'your-api-secret',
          });
        } catch (err) {
          setError('Failed to initialize plugin');
        }
      }
    };

    initPlugin();
  }, []);

  // Fetch all stacks when config is available
  useEffect(() => {
    if (!config) return;

    const fetchAllStacks = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Initialize the service with config
        spaceliftService.initialize(config);

        // Fetch all stacks with metrics in one optimized call
        const { stacks: stacksData, metrics: metricsMap } = await spaceliftService.getAllStacksWithMetrics();
        setStacks(stacksData);
        setStackMetrics(metricsMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stacks data');
      } finally {
        setLoading(false);
      }
    };

    fetchAllStacks();
  }, [config]);

  // Error states
  if (!config) {
    return (
      <div style={{ padding: '16px', color: '#dc3545' }}>
        Plugin configuration is required. Please configure your Spacelift API credentials.
      </div>
    );
  }

  if (!config.spaceliftEndpoint || !config.apiKeyId || !config.apiKeySecret) {
    return (
      <div style={{ padding: '16px', color: '#dc3545' }}>
        Missing required configuration: spaceliftEndpoint, apiKeyId, and apiKeySecret are required.
      </div>
    );
  }

  // Loading state
  if (loading) {
    return <div style={{ padding: '16px' }}>Loading Spacelift stacks...</div>;
  }

  // Error state
  if (error) {
    return <div style={{ padding: '16px', color: '#dc3545' }}>Error: {error}</div>;
  }

  // No stacks state
  if (stacks.length === 0) {
    return <div style={{ padding: '16px' }}>No stacks found in your Spacelift account</div>;
  }

  // Get badge variant based on state
  const getStateBadgeVariant = (state: string) => {
    switch (state) {
      case 'READY': return 'success';
      case 'PREPARING': return 'warning';
      case 'DISCARDED': return 'secondary';
      case 'DELETING': return 'destructive';
      default: return 'secondary';
    }
  };

  const getRunBadgeVariant = (state: string) => {
    switch (state) {
      case 'FINISHED': return 'success';
      case 'FAILED': return 'destructive';
      case 'QUEUED':
      case 'PREPARING':
      case 'PLANNING':
      case 'APPLYING': return 'warning';
      default: return 'secondary';
    }
  };

  // Calculate summary metrics
  const totalStacks = stacks.length;
  const healthyStacks = stacks.filter(stack => {
    const metrics = stackMetrics[stack.id];
    // Consider a stack healthy based on its last run state
    // FINISHED = successful completion
    // QUEUED, PREPARING, PLANNING, APPLYING = in progress states
    const healthyRunStates = ['FINISHED', 'QUEUED', 'PREPARING', 'PLANNING', 'APPLYING'];
    return metrics?.lastRunState && healthyRunStates.includes(metrics.lastRunState);
  }).length;
  const overallHealthPercent = totalStacks > 0 ? Math.round((healthyStacks / totalStacks) * 100) : 0;
  const totalResources = Object.values(stackMetrics).reduce((sum, m) => sum + m.resourceCount, 0);
  const totalRuns = Object.values(stackMetrics).reduce((sum, m) => sum + m.totalRuns, 0);

  return (
    <div className="spacelift-plugin">
      {/* Summary Header */}
      <Card>
        <div className="plugin-header">
          <h2 className="stack-title">Spacelift Infrastructure</h2>
          <Badge variant={overallHealthPercent >= 80 ? 'success' : overallHealthPercent >= 60 ? 'warning' : 'destructive'}>
            {overallHealthPercent}% Healthy
          </Badge>
        </div>

        {/* Summary Metrics */}
        <div className="metrics-section">
          <div className="metric-item">
            <span className="metric-label">Total Stacks</span>
            <span className="metric-value">{totalStacks}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Healthy Stacks</span>
            <span className="metric-value success">{healthyStacks}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Total Resources</span>
            <span className="metric-value">{totalResources}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Total Runs</span>
            <span className="metric-value">{totalRuns}</span>
          </div>
        </div>
      </Card>

      {/* Stacks Grid */}
      <div 
        className="stacks-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '16px',
          marginTop: '16px'
        }}
      >
        {stacks.map((stack) => {
          const metrics = stackMetrics[stack.id];
          if (!metrics) return null;

          return (
            <Card key={stack.id}>
              <div className="stack-card">
                {/* Stack Header */}
                <div className="stack-header">
                  <h3 className="stack-name">{stack.name}</h3>
                  <Badge variant={getStateBadgeVariant(stack.state)}>{stack.state}</Badge>
                </div>

                {/* Stack Info */}
                <div className="stack-info">
                  {metrics.lastTriggeredBy && (
                    <div className="stack-detail">
                      <span className="detail-label">Last triggered by</span>
                      <span className="detail-value">{metrics.lastTriggeredBy}</span>
                    </div>
                  )}
                  <div className="stack-detail">
                    <span className="detail-label">Repository</span>
                    <span className="detail-value">{stack.repository}</span>
                  </div>
                  <div className="stack-detail">
                    <span className="detail-label">Branch</span>
                    <span className="detail-value">{stack.branch}</span>
                  </div>
                  {stack.space && (
                    <div className="stack-detail">
                      <span className="detail-label">Space</span>
                      <span className="detail-value">{stack.space}</span>
                    </div>
                  )}
                </div>

                {/* Stack Configuration */}
                <div className="stack-config">
                  {stack.autodeploy && (
                    <Badge variant="success" size="xs">Auto-deploy</Badge>
                  )}
                  {stack.autoretry && (
                    <Badge variant="secondary" size="xs">Auto-retry</Badge>
                  )}
                  {stack.administrative && (
                    <Badge variant="warning" size="xs">Administrative</Badge>
                  )}
                </div>

                {/* Stack Labels */}
                {stack.labels && stack.labels.length > 0 && (
                  <div className="stack-labels">
                    <span className="labels-title">Labels:</span>
                    <div className="labels-container">
                      {stack.labels.slice(0, 3).map((label, index) => (
                        <Badge key={index} variant="outline" size="xs">{label}</Badge>
                      ))}
                      {stack.labels.length > 3 && (
                        <Badge variant="outline" size="xs">+{stack.labels.length - 3} more</Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Stack Metrics */}
                <div className="stack-metrics">
                  <div className="stack-metric">
                    <span className="metric-number">{metrics.totalRuns}</span>
                    <span className="metric-label">Runs</span>
                  </div>
                  <div className="stack-metric">
                    <span className="metric-number success">
                      {metrics.totalRuns > 0 ? `${Math.round((metrics.successfulRuns / metrics.totalRuns) * 100)}%` : 'N/A'}
                    </span>
                    <span className="metric-label">Success</span>
                  </div>
                  <div className="stack-metric">
                    <span className="metric-number">{metrics.resourceCount}</span>
                    <span className="metric-label">Resources</span>
                  </div>
                </div>

                {/* Last Run Status */}
                <div className="stack-status">
                  <span className="status-label">Last Run:</span>
                  <Badge variant={getRunBadgeVariant(metrics.lastRunState)} size="xs">
                    {metrics.lastRunState}
                  </Badge>
                </div>

                {/* Stack Actions */}
                <div className="stack-actions">
                  <Button 
                    onClick={() => window.open(`${config.spaceliftEndpoint}/stack/${stack.id}`, '_blank')}
                  >
                    View Stack
                  </Button>
                  <Button 
                    onClick={async () => {
                      try {
                        const runId = await spaceliftService.triggerRun(stack.id);
                        if (runId) {
                          // Redirect to the triggered run in Spacelift
                          window.open(`${config.spaceliftEndpoint}/stack/${stack.id}/run/${runId}`, '_blank');
                        } else {
                          alert(`Run triggered for ${stack.name} but no run ID returned`);
                        }
                      } catch (error) {
                        console.error('Failed to trigger run:', error);
                        alert(`Failed to trigger run for ${stack.name}`);
                      }
                    }}
                  >
                    Trigger Run
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};