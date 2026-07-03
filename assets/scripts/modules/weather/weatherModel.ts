import { WeatherType, WeatherConfig, WEATHER_CONFIGS } from '../../types/weather';

export function getSpeedModifier(weather: WeatherType): number {
  return WEATHER_CONFIGS[weather].speedMod;
}

export function getControlModifier(weather: WeatherType): number {
  return WEATHER_CONFIGS[weather].controlMod;
}

export function getVisibility(weather: WeatherType): number {
  return WEATHER_CONFIGS[weather].visibility;
}

export function getWindForce(weather: WeatherType): number {
  return WEATHER_CONFIGS[weather].windForce;
}

export function getWindDir(weather: WeatherType): number {
  return WEATHER_CONFIGS[weather].windDir;
}

export function getWindOffset(weather: WeatherType, playerDir: number): number {
  const wind = WEATHER_CONFIGS[weather];
  if (wind.windForce === 0) return 0;

  const windRad = (wind.windDir * Math.PI) / 180;
  const playerRad = (playerDir * Math.PI) / 180;
  const angleDiff = windRad - playerRad;

  return Math.sin(angleDiff) * wind.windForce * 0.5;
}

export function lerpWeather(a: WeatherConfig, b: WeatherConfig, t: number): WeatherConfig {
  return {
    type: t < 0.5 ? a.type : b.type,
    visibility: a.visibility + (b.visibility - a.visibility) * t,
    speedMod: a.speedMod + (b.speedMod - a.speedMod) * t,
    controlMod: a.controlMod + (b.controlMod - a.controlMod) * t,
    windForce: a.windForce + (b.windForce - a.windForce) * t,
    windDir: a.windDir + (b.windDir - a.windDir) * t,
  };
}
