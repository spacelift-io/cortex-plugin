import React, {useEffect, useState} from 'react';
import {Badge, Button, Card} from '@cortexapps/react-plugin-ui';
import {CortexApi} from '@cortexapps/plugin-core';
import {SpaceliftService} from '../services/spaceliftService';
import {SpaceStack, StackMetrics} from '../types/spacelift';
import SpacelifeLogo from '../assets/spacelift-logo.svg';
import './SpaceliftPlugin.css';

import SPACELIFT_AUTH_LAMBDA_URL from './TF_build_consts';

interface SpaceliftPluginConfig {
  spaceliftEndpoint: string;
  apiToken: string;
}

export const SpaceliftPlugin: React.FC = () => {
  const [config, setConfig] = useState<SpaceliftPluginConfig | null>(null);
  const [stacks, setStacks] = useState<SpaceStack[]>([]);
  const [stackMetrics, setStackMetrics] = useState<Record<string, StackMetrics>>({});
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spaceliftService] = useState(new SpaceliftService());

  // Initialize plugin and fetch context
  useEffect(() => {
    const initPlugin = async () => {
      try {
        console.log('Initializing Cortex API...');
        CortexApi.pluginInit();

        const response = await CortexApi.proxyFetch(SPACELIFT_AUTH_LAMBDA_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        });

        if (!response.ok) {
          let errorDetails = '';
          try {
            errorDetails = await response.text();
          } catch (e) {
            console.log('Could not read error response');
          }
          throw new Error(`Lambda auth failed: ${response.status} ${response.statusText}. Details: ${errorDetails}`);
        }

        const authData = await response.json();

        // Store the token and endpoint for direct Spacelift API calls
        setConfig({
          spaceliftEndpoint: authData.endpoint,
          apiToken: authData.token,
        });
      } catch (err) {
        console.error('Plugin initialization error:', err);
        setError(`Failed to initialize plugin: ${err}`);
      } finally {
        setInitializing(false);
      }
    };

    initPlugin().then(() => {
    }).catch(err => {
      console.error(err);
    });
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
        const {stacks: stacksData, metrics: metricsMap} = await spaceliftService.getAllStacksWithMetrics();
        setStacks(stacksData);
        setStackMetrics(metricsMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stacks data');
      } finally {
        setLoading(false);
      }
    };

    fetchAllStacks().then(() => {
    }).catch(err => {
      console.error(err);
    });
  }, [config]);

  // Initial loading state - show this first before any errors
  if (initializing) {
    return (
      <div style={{
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        <img
          src={SpacelifeLogo}
          alt="Spacelift Logo"
          width="120"
          height="32"
          style={{opacity: 0.8}}
        />
        <div>Loading Spacelift plugin...</div>
      </div>
    );
  }

  // Error states (only show after initialization is complete)
  if (error) {
    return (
      <div style={{
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        <img
          src={SpacelifeLogo}
          alt="Spacelift Logo"
          width="120"
          height="32"
          style={{opacity: 0.8}}
        />
        <div style={{color: '#dc3545'}}>Error: {error}</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div style={{
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        <img
          src={SpacelifeLogo}
          alt="Spacelift Logo"
          width="120"
          height="32"
          style={{opacity: 0.8}}
        />
        <div style={{color: '#dc3545'}}>
          Plugin configuration is required. Please configure your Spacelift API credentials.
        </div>
      </div>
    );
  }

  if (!config.spaceliftEndpoint) {
    return (
      <div style={{
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        <img
          src={SpacelifeLogo}
          alt="Spacelift Logo"
          width="120"
          height="32"
          style={{opacity: 0.8}}
        />
        <div style={{color: '#dc3545'}}>
          Missing required configuration: spaceliftEndpoint is required.
        </div>
      </div>
    );
  }

  // Loading stacks state
  if (loading) {
    return (
      <div style={{
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        <img
          src={SpacelifeLogo}
          alt="Spacelift Logo"
          width="120"
          height="32"
          style={{opacity: 0.8}}
        />
        <div>Loading Spacelift stacks...</div>
      </div>
    );
  }

  // No stacks state
  if (stacks.length === 0) {
    return (
      <div style={{
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        <img
          src={SpacelifeLogo}
          alt="Spacelift Logo"
          width="120"
          height="32"
          style={{opacity: 0.8}}
        />
        <div>No stacks found in your Spacelift account</div>
      </div>
    );
  }

  const getStateBadgeVariant = (state: string) => {
    switch (state) {
      case 'FINISHED':
        return 'success';
      case 'DELETING':
      case 'FAILED':
        return 'destructive';
      case 'QUEUED':
      case 'PREPARING':
      case 'PLANNING':
      case 'APPLYING':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  // Helper functions for semantic CSS classes
  const getSuccessRateClass = (rate: number): string => {
    if (rate >= 80) return 'success-rate-high';
    if (rate >= 60) return 'success-rate-medium';
    return 'success-rate-low';
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
          <Badge
            variant={overallHealthPercent >= 80 ? 'success' : overallHealthPercent >= 60 ? 'warning' : 'destructive'}>
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
                  <div>
                    <h3 className="stack-name">{stack.name}</h3>
                  </div>
                  <Badge
                    variant={getStateBadgeVariant(stack.state)}
                    className={`stack-state-badge stack-state-${stack.state.toLowerCase()}`}
                  >
                    {stack.state}
                  </Badge>
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
                        <Badge variant="outline"
                               size="xs">+{stack.labels.length - 3} more</Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Stack Metrics */}
                <div className="stack-metrics">
                  <div className="stack-metric">
                    <span className="metric-number">{metrics.totalRuns}</span>
                    <span className="metric-label">Total Runs</span>
                  </div>
                  <div className="stack-metric">
                    {metrics.totalRuns > 0 ? (
                      <span
                        className={`metric-number ${getSuccessRateClass((metrics.successfulRuns / metrics.totalRuns) * 100)}`}>
                                                {Math.round((metrics.successfulRuns / metrics.totalRuns) * 100)}%
                                            </span>
                    ) : (
                      <span className="metric-number">N/A</span>
                    )}
                    <span className="metric-label">Success Rate</span>
                  </div>
                  <div className="stack-metric">
                    {metrics.failedRuns > 0 ? (
                      <span className="metric-number error">{metrics.failedRuns}</span>
                    ) : (
                      <span className="metric-number">{metrics.failedRuns}</span>
                    )}
                    <span className="metric-label">Failed Runs</span>
                  </div>
                  <div className="stack-metric">
                    <span className="metric-number">{metrics.resourceCount}</span>
                    <span className="metric-label">Resources</span>
                  </div>
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
