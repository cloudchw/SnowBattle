export type WeatherType = 'clear' | 'light_snow' | 'blizzard' | 'fog' | 'night' | 'wind';

export interface WeatherConfig {
  readonly type: WeatherType;
  readonly visibility: number;
  readonly speedMod: number;
  readonly controlMod: number;
  readonly windForce: number;
  readonly windDir: number;
}

export const WEATHER_CONFIGS: Readonly<Record<WeatherType, WeatherConfig>> = {
  clear:      { type: 'clear',      visibility: 1.0, speedMod: 1.0, controlMod: 1.0, windForce: 0, windDir: 0 },
  light_snow: { type: 'light_snow', visibility: 0.8, speedMod: 0.9, controlMod: 0.9, windForce: 1, windDir: 45 },
  blizzard:   { type: 'blizzard',   visibility: 0.3, speedMod: 0.6, controlMod: 0.5, windForce: 4, windDir: 90 },
  fog:        { type: 'fog',        visibility: 0.2, speedMod: 0.8, controlMod: 0.8, windForce: 0, windDir: 0 },
  night:      { type: 'night',      visibility: 0.5, speedMod: 1.0, controlMod: 0.9, windForce: 0, windDir: 0 },
  wind:       { type: 'wind',       visibility: 0.9, speedMod: 1.0, controlMod: 0.8, windForce: 3, windDir: 180 },
};
