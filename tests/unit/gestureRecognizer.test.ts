import { recognizeGesture } from '../../assets/scripts/modules/input/gestureRecognizer';

describe('recognizeGesture', () => {
  const screenWidth = 1920;

  it('should recognize upward swipe on left screen', () => {
    const result = recognizeGesture(200, 500, 200, 400, 0, 200, screenWidth);
    expect(result).not.toBeNull();
    expect(result?.direction).toBe('up');
    expect(result?.screen).toBe('left');
  });

  it('should recognize downward swipe on left screen', () => {
    const result = recognizeGesture(200, 400, 200, 500, 0, 200, screenWidth);
    expect(result).not.toBeNull();
    expect(result?.direction).toBe('down');
    expect(result?.screen).toBe('left');
  });

  it('should recognize right swipe on right screen', () => {
    const result = recognizeGesture(1200, 400, 1300, 400, 0, 200, screenWidth);
    expect(result).not.toBeNull();
    expect(result?.direction).toBe('right');
    expect(result?.screen).toBe('right');
  });

  it('should recognize left swipe on right screen', () => {
    const result = recognizeGesture(1300, 400, 1200, 400, 0, 200, screenWidth);
    expect(result).not.toBeNull();
    expect(result?.direction).toBe('left');
    expect(result?.screen).toBe('right');
  });

  it('should return null for too short swipe', () => {
    const result = recognizeGesture(200, 400, 210, 400, 0, 200, screenWidth);
    expect(result).toBeNull();
  });

  it('should return null for too slow swipe', () => {
    const result = recognizeGesture(200, 400, 300, 400, 0, 600, screenWidth);
    expect(result).toBeNull();
  });
});
