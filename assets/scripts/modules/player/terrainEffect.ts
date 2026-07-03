import { ObstacleType } from '../../types/obstacle';

export type TerrainType = 'snow' | 'ice' | 'uphill' | 'downhill' | 'hot_spring';

export function getTerrainSpeedModifier(terrain: TerrainType): number {
  switch (terrain) {
    case 'snow': return 1.0;
    case 'ice': return 1.2;
    case 'uphill': return 0.7;
    case 'downhill': return 1.3;
    case 'hot_spring': return 0.8;
    default: return 1.0;
  }
}

export function getTerrainControlModifier(terrain: TerrainType): number {
  switch (terrain) {
    case 'snow': return 1.0;
    case 'ice': return 0.5;
    case 'uphill': return 1.0;
    case 'downhill': return 1.0;
    case 'hot_spring': return 1.0;
    default: return 1.0;
  }
}

export function obstacleTypeToTerrain(type: ObstacleType): TerrainType | null {
  switch (type) {
    case 'ice': return 'ice';
    case 'hill': return 'uphill';
    case 'hot_spring': return 'hot_spring';
    default: return null;
  }
}
