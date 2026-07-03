import { AnalyticsEvent } from '../../types/analytics';

export function validateAnalyticsEvent(event: any): event is AnalyticsEvent {
  if (!event || typeof event !== 'object') return false;
  if (typeof event.name !== 'string') return false;
  if (typeof event.ts !== 'number') return false;

  const validNames = [
    'app_launch', 'load_complete', 'tutorial_complete', 'level_start',
    'level_complete', 'level_fail', 'gesture_used', 'powerup_used',
    'pause', 'revive_used', 'ad_expose', 'ad_complete',
  ];

  return validNames.includes(event.name);
}

export function sanitizeEvent(event: AnalyticsEvent): AnalyticsEvent {
  return {
    name: event.name,
    ts: event.ts,
    ...('clientVersion' in event ? { clientVersion: (event as any).clientVersion } : {}),
    ...('durationMs' in event ? { durationMs: (event as any).durationMs } : {}),
    ...('levelId' in event ? { levelId: (event as any).levelId } : {}),
    ...('mode' in event ? { mode: (event as any).mode } : {}),
    ...('stars' in event ? { stars: (event as any).stars } : {}),
    ...('timeUsedMs' in event ? { timeUsedMs: (event as any).timeUsedMs } : {}),
    ...('coinsCollected' in event ? { coinsCollected: (event as any).coinsCollected } : {}),
    ...('reason' in event ? { reason: (event as any).reason } : {}),
    ...('progressPct' in event ? { progressPct: (event as any).progressPct } : {}),
    ...('gesture' in event ? { gesture: (event as any).gesture } : {}),
    ...('powerupType' in event ? { powerupType: (event as any).powerupType } : {}),
    ...('via' in event ? { via: (event as any).via } : {}),
    ...('placement' in event ? { placement: (event as any).placement } : {}),
  } as AnalyticsEvent;
}
