import { resizeFor } from './capture';

jest.mock('expo-file-system', () => ({ File: class {} }));
jest.mock('expo-image-manipulator', () => ({ ImageManipulator: {}, SaveFormat: { JPEG: 'jpeg' } }));
jest.mock('expo-image-picker', () => ({}));
jest.mock('@react-native-async-storage/async-storage', () => ({}));

describe('resizeFor', () => {
  it('limits the longest edge and keeps the aspect ratio', () => {
    expect(resizeFor(4000, 3000, 1600)).toEqual({ width: 1600 });
    expect(resizeFor(3000, 4000, 1600)).toEqual({ height: 1600 });
    expect(resizeFor(4000, 3000, 1200)).toEqual({ width: 1200 });
  });

  it('never upscales small photos', () => {
    expect(resizeFor(1200, 900, 1600)).toBeNull();
    expect(resizeFor(1600, 1600, 1600)).toBeNull();
  });
});
