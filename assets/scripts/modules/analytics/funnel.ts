export type FunnelNode = 'launch' | 'loaded' | 'tutorial' | 'lv1' | 'lv5' | 'lv10' | 'lv20';

export const FUNNEL_ORDER: FunnelNode[] = [
  'launch',
  'loaded',
  'tutorial',
  'lv1',
  'lv5',
  'lv10',
  'lv20',
];

export function getFunnelIndex(node: FunnelNode): number {
  return FUNNEL_ORDER.indexOf(node);
}

export function isFunnelComplete(completedNodes: FunnelNode[], targetNode: FunnelNode): boolean {
  const targetIndex = getFunnelIndex(targetNode);
  return completedNodes.some(node => getFunnelIndex(node) >= targetIndex);
}
