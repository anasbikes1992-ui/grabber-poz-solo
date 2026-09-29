export type HandoverTaskInput = {
  taskKey: string;
  label: string;
  status: string;
  owner?: string;
  completedAt?: Date | string | null;
};

export type HandoverClientInput = {
  id: string;
  businessName: string;
  ownerName: string;
  status: string;
  targetDomain?: string | null;
  databaseName?: string | null;
  appStatus: string;
  databaseStatus: string;
  handoverStatus: string;
  verticalPreset: string;
  layoutTemplate: string;
  nextAction?: string | null;
};

export type HandoverDeploymentInput = {
  id: string;
  clientId?: string | null;
  businessName: string;
  domain?: string | null;
  databaseName?: string | null;
  deployStatus: string;
  healthStatus: string;
  commitSha?: string | null;
  lastDeployedAt?: Date | string | null;
  lastCheckedAt?: Date | string | null;
};

export type HandoverReadiness = {
  clientId: string;
  businessName: string;
  ownerName: string;
  targetDomain: string | null;
  databaseName: string | null;
  verticalPreset: string;
  layoutTemplate: string;
  checklistTotal: number;
  checklistDone: number;
  checklistBlocked: number;
  checklistPercent: number;
  ready: boolean;
  grade: 'READY' | 'NEEDS_REVIEW' | 'BLOCKED';
  blockers: string[];
  nextAction: string;
  deployment: {
    deployStatus: string;
    healthStatus: string;
    commitSha: string | null;
    lastDeployedAt: string | null;
    lastCheckedAt: string | null;
  } | null;
};

function iso(value?: Date | string | null) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function normalize(value?: string | null) {
  return String(value || '').trim().toUpperCase();
}

function sameNullableText(a?: string | null, b?: string | null) {
  const left = String(a || '').trim().toLowerCase();
  const right = String(b || '').trim().toLowerCase();
  return Boolean(left && right && left === right);
}

export function findBestDeployment(
  client: HandoverClientInput,
  deployments: HandoverDeploymentInput[],
): HandoverDeploymentInput | null {
  return (
    deployments.find((deployment) => deployment.clientId === client.id) ||
    deployments.find((deployment) => sameNullableText(deployment.domain, client.targetDomain)) ||
    deployments.find((deployment) => sameNullableText(deployment.databaseName, client.databaseName)) ||
    deployments.find((deployment) => sameNullableText(deployment.businessName, client.businessName)) ||
    null
  );
}

export function evaluateHandoverReadiness(
  client: HandoverClientInput,
  tasks: HandoverTaskInput[],
  deployment: HandoverDeploymentInput | null,
): HandoverReadiness {
  const blockers: string[] = [];
  const checklistTotal = tasks.length;
  const checklistDone = tasks.filter((task) => normalize(task.status) === 'DONE').length;
  const checklistBlocked = tasks.filter((task) => normalize(task.status) === 'BLOCKED').length;
  const checklistPercent = checklistTotal ? Math.round((checklistDone / checklistTotal) * 100) : 0;
  const taskMap = new Map(tasks.map((task) => [task.taskKey, normalize(task.status)]));

  if (!client.targetDomain) blockers.push('Target domain is missing');
  if (!client.databaseName) blockers.push('Isolated database name is missing');
  if (normalize(client.appStatus) !== 'READY') blockers.push('App status is not READY');
  if (normalize(client.databaseStatus) !== 'READY') blockers.push('Database status is not READY');
  if (!['READY', 'HANDED_OVER'].includes(normalize(client.handoverStatus))) blockers.push('Handover status is not READY');
  if (checklistTotal === 0) blockers.push('Provisioning checklist has no tasks');
  if (checklistTotal > 0 && checklistDone !== checklistTotal) blockers.push('Provisioning checklist is not fully complete');
  if (checklistBlocked > 0) blockers.push('Provisioning checklist has blocked tasks');
  if (taskMap.get('smoke_test') !== 'DONE') blockers.push('Smoke test task is not complete');
  if (taskMap.get('handover') !== 'DONE') blockers.push('Handover SOP task is not complete');
  if (!deployment) {
    blockers.push('No linked deployment record found');
  } else {
    if (normalize(deployment.deployStatus) !== 'LIVE') blockers.push('Deployment is not LIVE');
    if (normalize(deployment.healthStatus) !== 'HEALTHY') blockers.push('Deployment health is not HEALTHY');
  }

  const ready = blockers.length === 0;
  const grade = ready ? 'READY' : blockers.some((item) => item.toLowerCase().includes('blocked')) ? 'BLOCKED' : 'NEEDS_REVIEW';

  return {
    clientId: client.id,
    businessName: client.businessName,
    ownerName: client.ownerName,
    targetDomain: client.targetDomain || null,
    databaseName: client.databaseName || null,
    verticalPreset: client.verticalPreset,
    layoutTemplate: client.layoutTemplate,
    checklistTotal,
    checklistDone,
    checklistBlocked,
    checklistPercent,
    ready,
    grade,
    blockers,
    nextAction: ready ? 'Ready for supervised client handover' : blockers[0] || client.nextAction || 'Review handover readiness',
    deployment: deployment
      ? {
          deployStatus: deployment.deployStatus,
          healthStatus: deployment.healthStatus,
          commitSha: deployment.commitSha || null,
          lastDeployedAt: iso(deployment.lastDeployedAt),
          lastCheckedAt: iso(deployment.lastCheckedAt),
        }
      : null,
  };
}

export function summarizeHandover(readiness: HandoverReadiness[]) {
  return {
    total: readiness.length,
    ready: readiness.filter((item) => item.grade === 'READY').length,
    needsReview: readiness.filter((item) => item.grade === 'NEEDS_REVIEW').length,
    blocked: readiness.filter((item) => item.grade === 'BLOCKED').length,
  };
}
