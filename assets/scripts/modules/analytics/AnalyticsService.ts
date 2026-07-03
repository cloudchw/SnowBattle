import { AnalyticsEvent } from '../../types/analytics';
import { cloudBridge } from '../cloud/CloudBridge';

export class AnalyticsService {
  private static instance: AnalyticsService;
  private buffer: AnalyticsEvent[] = [];
  private uid: string = '';
  private flushTimer: number = 0;
  private flushInterval: number = 30000;

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  setUserId(uid: string): void {
    this.uid = uid;
  }

  track(event: AnalyticsEvent): void {
    this.buffer.push(event);
    if (this.buffer.length >= 20) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    await cloudBridge.reportAnalytics(events);
  }

  funnel(node: 'launch' | 'loaded' | 'tutorial' | 'lv1' | 'lv5' | 'lv10' | 'lv20'): void {
    const nameMap: Record<typeof node, AnalyticsEvent['name']> = {
      launch: 'app_launch',
      loaded: 'load_complete',
      tutorial: 'tutorial_complete',
      lv1: 'level_start',
      lv5: 'level_start',
      lv10: 'level_start',
      lv20: 'level_start',
    };

    this.track({
      name: nameMap[node],
      ts: Date.now(),
      ...(node === 'launch' ? { clientVersion: '1.0.0' } : {}),
      ...(node.startsWith('lv') ? { levelId: node, mode: 'level' as const } : {}),
      ...(node === 'loaded' ? { durationMs: 0 } : {}),
    } as AnalyticsEvent);
  }

  tick(dt: number): void {
    this.flushTimer += dt;
    if (this.flushTimer >= this.flushInterval) {
      this.flushTimer = 0;
      this.flush();
    }
  }

  destroy(): void {
    this.flush();
  }
}

export const analyticsService = AnalyticsService.getInstance();
