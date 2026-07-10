import { AnalyticsEvent } from '../../types/analytics';

const VALID_EVENT_NAMES = [
  'app_launch', 'load_complete', 'tutorial_complete', 'level_start',
  'level_complete', 'level_fail', 'gesture_used', 'powerup_used',
  'pause', 'revive_used', 'ad_expose', 'ad_complete',
] as const;

/** 运行时校验未知来源的事件对象是否符合 AnalyticsEvent 形状。 */
export function validateAnalyticsEvent(event: unknown): event is AnalyticsEvent {
  if (!event || typeof event !== 'object') return false;
  const e = event as Record<string, unknown>;
  if (typeof e.name !== 'string') return false;
  if (typeof e.ts !== 'number') return false;
  return (VALID_EVENT_NAMES as readonly string[]).includes(e.name);
}

/** 白名单净化：只保留 AnalyticsEvent 的已知字段，剔除未知字段。 */
export function sanitizeEvent(event: AnalyticsEvent): AnalyticsEvent {
  return {
    name: event.name,
    ts: event.ts,
    ...('clientVersion' in event ? { clientVersion: event.clientVersion } : {}),
    ...('durationMs' in event ? { durationMs: event.durationMs } : {}),
    ...('levelId' in event ? { levelId: event.levelId } : {}),
    ...('mode' in event ? { mode: event.mode } : {}),
    ...('stars' in event ? { stars: event.stars } : {}),
    ...('timeUsedMs' in event ? { timeUsedMs: event.timeUsedMs } : {}),
    ...('coinsCollected' in event ? { coinsCollected: event.coinsCollected } : {}),
    ...('reason' in event ? { reason: event.reason } : {}),
    ...('progressPct' in event ? { progressPct: event.progressPct } : {}),
    ...('gesture' in event ? { gesture: event.gesture } : {}),
    ...('powerupType' in event ? { powerupType: event.powerupType } : {}),
    ...('via' in event ? { via: event.via } : {}),
    ...('placement' in event ? { placement: event.placement } : {}),
  } as AnalyticsEvent;
}
