export interface ManagedEntity {
  id: string;
  name: string;
  type: string;
}

export interface SpaceStack {
  id: string;
  name: string;
  description?: string;
  state: 'READY' | 'PREPARING' | 'DISCARDED' | 'DELETING';
  administrative: boolean;
  autodeploy: boolean;
  autoretry: boolean;
  repository: string;
  branch: string;
  provider: 'TERRAFORM' | 'PULUMI' | 'CLOUDFORMATION' | 'ANSIBLE' | 'KUBERNETES';
  space: string;
  labels: string[];
  entities?: ManagedEntity[];
  runs?: SpaceRun[];
  driftDetection?: {
    reconcile: boolean;
    schedule: string[];
  };
}

export interface SpaceRun {
  id: string;
  state: 'QUEUED' | 'PREPARING' | 'PLANNING' | 'TRACKED' | 'APPLYING' | 'FINISHED' | 'FAILED' | 'STOPPED' | 'SKIPPED' | 'DISCARDED';
  type: 'PROPOSED' | 'TRACKED' | 'DESTROY';
  createdAt: string;
  updatedAt: string;
  title?: string;
  triggeredBy?: string;
  commit: {
    hash: string;
    message: string;
    authorName: string;
    timestamp: string;
  };
  delta?: {
    added: number;
    changed: number;
    deleted: number;
  };
}

export interface StackMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  lastRunState: string;
  lastRunTime?: string;
  lastTriggeredBy?: string;
  driftDetected: boolean;
  resourceCount: number;
}
