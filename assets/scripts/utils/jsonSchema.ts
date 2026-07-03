import { LevelConfig } from '../types/level';

const LEVEL_SCHEMA = {
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

export function validateLevelConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Config is not an object'] };
  }

  if (typeof config.id !== 'string' || !/^Lv_\d{3}$/.test(config.id)) {
    errors.push('Invalid level ID format (expected Lv_XXX)');
  }

  if (typeof config.name !== 'string' || config.name.length === 0) {
    errors.push('Level name is required');
  }

  if (typeof config.chapter !== 'number' || config.chapter < 1 || config.chapter > 6) {
    errors.push('Chapter must be 1-6');
  }

  if (!['level', 'endless'].includes(config.mode)) {
    errors.push('Invalid mode');
  }

  if (!config.weather || typeof config.weather !== 'object') {
    errors.push('Weather config is required');
  }

  if (!Array.isArray(config.obstacles)) {
    errors.push('Obstacles must be an array');
  }

  if (!config.collectibles || typeof config.collectibles !== 'object') {
    errors.push('Collectibles config is required');
  }

  if (!config.goals || typeof config.goals !== 'object') {
    errors.push('Goals config is required');
  }

  if (!config.stars_threshold || typeof config.stars_threshold !== 'object') {
    errors.push('Stars threshold config is required');
  }

  if (typeof config.difficulty !== 'number' || config.difficulty < 0 || config.difficulty > 1) {
    errors.push('Difficulty must be 0-1');
  }

  return { valid: errors.length === 0, errors };
}
