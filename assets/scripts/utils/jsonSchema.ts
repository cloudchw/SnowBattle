/**
 * 关卡 JSON schema（JSON Schema 风格，预留给校验工具/CLI 使用）。
 * validateLevelConfig 当前用手写校验，schema 作为权威结构定义导出。
 */
export const LEVEL_SCHEMA = {
  type: 'object',
  required: ['id', 'name', 'chapter', 'terrain', 'mode', 'weather', 'obstacles', 'collectibles', 'goals', 'stars_threshold', 'difficulty'],
  properties: {
    id: { type: 'string', pattern: '^Lv_\\d{3}$' },
    name: { type: 'string', minLength: 1 },
    chapter: { type: 'number', minimum: 1, maximum: 6 },
    terrain: { type: 'string', minLength: 1 },
    mode: { type: 'string', enum: ['level', 'endless'] },
    weather: {
      type: 'object',
      required: ['type', 'visibility', 'speedMod', 'controlMod', 'windForce', 'windDir'],
      properties: {
        type: { type: 'string', enum: ['clear', 'light_snow', 'blizzard', 'fog', 'night', 'wind'] },
        visibility: { type: 'number', minimum: 0, maximum: 1 },
        speedMod: { type: 'number', minimum: 0, maximum: 2 },
        controlMod: { type: 'number', minimum: 0, maximum: 2 },
        windForce: { type: 'number', minimum: 0, maximum: 5 },
        windDir: { type: 'number', minimum: 0, maximum: 359 },
      },
    },
    obstacles: {
      type: 'array',
      items: {
        type: 'object',
        required: ['type', 'position', 'state'],
        properties: {
          type: { type: 'string', enum: ['tree', 'cliff', 'hill', 'skier', 'snow_pile', 'ice', 'hot_spring', 'rock'] },
          position: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
          state: { type: 'string', enum: ['normal', 'warning', 'danger'] },
          count: { type: 'number', minimum: 1 },
        },
      },
    },
    collectibles: {
      type: 'object',
      required: ['coins', 'powerups'],
      properties: {
        coins: {
          type: 'object',
          required: ['count', 'pattern'],
          properties: {
            count: { type: 'number', minimum: 0 },
            pattern: { type: 'string' },
          },
        },
        powerups: {
          type: 'array',
          items: {
            type: 'object',
            required: ['type', 'position'],
            properties: {
              type: { type: 'string', enum: ['shield', 'speed', 'magnet', 'ice_pick', 'parachute', 'flare', 'snow_plow'] },
              position: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
            },
          },
        },
      },
    },
    goals: {
      type: 'object',
      required: ['primary', 'secondary'],
      properties: {
        primary: { type: 'string', enum: ['reach_end', 'survive_time', 'collect_coins'] },
        secondary: { type: 'object' },
      },
    },
    stars_threshold: {
      type: 'object',
      required: ['time_3star', 'time_2star', 'coins_3star', 'coins_2star'],
      properties: {
        time_3star: { type: 'number', minimum: 0 },
        time_2star: { type: 'number', minimum: 0 },
        coins_3star: { type: 'number', minimum: 0 },
        coins_2star: { type: 'number', minimum: 0 },
      },
    },
    difficulty: { type: 'number', minimum: 0, maximum: 1 },
  },
};

/**
 * 校验关卡配置对象。输入来源未知（CDN/本地 JSON），故用 unknown 入参后内部收窄。
 */
export function validateLevelConfig(config: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Config is not an object'] };
  }

  const c = config as Record<string, unknown>;

  if (typeof c.id !== 'string' || !/^Lv_\d{3}$/.test(c.id)) {
    errors.push('Invalid level ID format (expected Lv_XXX)');
  }

  if (typeof c.name !== 'string' || c.name.length === 0) {
    errors.push('Level name is required');
  }

  if (typeof c.chapter !== 'number' || c.chapter < 1 || c.chapter > 6) {
    errors.push('Chapter must be 1-6');
  }

  if (!['level', 'endless'].includes(c.mode as string)) {
    errors.push('Invalid mode');
  }

  if (!c.weather || typeof c.weather !== 'object') {
    errors.push('Weather config is required');
  }

  if (!Array.isArray(c.obstacles)) {
    errors.push('Obstacles must be an array');
  }

  if (!c.collectibles || typeof c.collectibles !== 'object') {
    errors.push('Collectibles config is required');
  }

  if (!c.goals || typeof c.goals !== 'object') {
    errors.push('Goals config is required');
  }

  if (!c.stars_threshold || typeof c.stars_threshold !== 'object') {
    errors.push('Stars threshold config is required');
  }

  if (typeof c.difficulty !== 'number' || c.difficulty < 0 || c.difficulty > 1) {
    errors.push('Difficulty must be 0-1');
  }

  return { valid: errors.length === 0, errors };
}
