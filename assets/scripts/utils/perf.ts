export type DeviceTier = 'high' | 'mid' | 'low';

export interface DeviceInfo {
  readonly tier: DeviceTier;
  readonly memoryMB: number;
  readonly gpuScore: number;
}

export function detectDeviceTier(): DeviceTier {
  const info = getDeviceInfo();
  if (info.memoryMB >= 4096 && info.gpuScore >= 80) return 'high';
  if (info.memoryMB >= 2048 && info.gpuScore >= 40) return 'mid';
  return 'low';
}

export function getDeviceInfo(): DeviceInfo {
  let memoryMB = 2048;
  let gpuScore = 50;

  if (typeof wx !== 'undefined' && wx.getDeviceInfo) {
    try {
      const deviceInfo = wx.getDeviceInfo();
      memoryMB = (deviceInfo as any).memoryMB || 2048;
    } catch (e) {
      // fallback
    }
  }

  gpuScore = estimateGpuScore();

  return {
    tier: memoryMB >= 4096 && gpuScore >= 80 ? 'high' :
          memoryMB >= 2048 && gpuScore >= 40 ? 'mid' : 'low',
    memoryMB,
    gpuScore,
  };
}

function estimateGpuScore(): number {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return 30;

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (debugInfo) {
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    if (renderer.includes('Adreno 6') || renderer.includes('Mali-G7') || renderer.includes('Apple GPU')) {
      return 90;
    }
    if (renderer.includes('Adreno 5') || renderer.includes('Mali-G5') || renderer.includes('PowerVR')) {
      return 60;
    }
  }

  return 50;
}

export const QUALITY_CONFIGS = {
  high: { particleCount: 150, enableShadows: true, enablePostProcess: true },
  mid:  { particleCount: 80,  enableShadows: false, enablePostProcess: true },
  low:  { particleCount: 30,  enableShadows: false, enablePostProcess: false },
} as const;
