/**
 * Receipt capture and compression (architecture.md §8): pick → resize longest edge ≤ 1600 px,
 * JPEG 0.7; if > 1.5 MB retry at 1200 px / 0.6; re-encoding drops EXIF/GPS metadata.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export const MAX_RECEIPT_BYTES = 1.5 * 1024 * 1024;
const ATTEMPTS = [
  { edge: 1600, compress: 0.7 },
  { edge: 1200, compress: 0.6 },
] as const;

export const RECEIPT_NOTICE_KEY = 'miniledger:receiptNoticeSeen';

export type CaptureSource = 'camera' | 'library';

export type CaptureResult =
  | { kind: 'ok'; file: File }
  | { kind: 'cancelled' }
  | { kind: 'denied'; canAskAgain: boolean }
  | { kind: 'tooLarge' }
  | { kind: 'failed' };

/** Target size keeping the aspect ratio, never upscaling. */
export function resizeFor(
  width: number,
  height: number,
  edge: number,
): { width: number } | { height: number } | null {
  if (Math.max(width, height) <= edge) return null;
  return width >= height ? { width: edge } : { height: edge };
}

async function compress(uri: string, width: number, height: number): Promise<File | null> {
  for (const attempt of ATTEMPTS) {
    const context = ImageManipulator.manipulate(uri);
    const size = resizeFor(width, height, attempt.edge);
    if (size) context.resize(size);
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ compress: attempt.compress, format: SaveFormat.JPEG });
    const file = new File(saved.uri);
    if (file.size > 0 && file.size <= MAX_RECEIPT_BYTES) return file;
    if (file.exists) file.delete();
  }
  return null;
}

/** Asks for the camera permission only when the user chose "Take photo" (design.md S11). */
export async function captureReceipt(source: CaptureSource): Promise<CaptureResult> {
  try {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return { kind: 'denied', canAskAgain: permission.canAskAgain };
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 1,
      exif: false,
      allowsEditing: false,
    };
    // The library uses the Android system photo picker, which needs no storage permission.
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return { kind: 'cancelled' };
    const asset = result.assets[0];
    if (!asset) return { kind: 'cancelled' };
    const file = await compress(asset.uri, asset.width, asset.height);
    return file ? { kind: 'ok', file } : { kind: 'tooLarge' };
  } catch {
    return { kind: 'failed' };
  }
}

export async function receiptNoticeSeen(): Promise<boolean> {
  return (await AsyncStorage.getItem(RECEIPT_NOTICE_KEY).catch(() => null)) === '1';
}

export async function markReceiptNoticeSeen(): Promise<void> {
  await AsyncStorage.setItem(RECEIPT_NOTICE_KEY, '1').catch(() => undefined);
}

export const RECEIPT_COPY = {
  notice:
    "Receipt photos are saved only on this device. They won't appear if you reinstall the app or switch phones.",
  localOnly: 'Saved on this device only',
  denied: 'Camera access is off. You can allow it in Settings > Apps > MiniLedger > Permissions.',
  tooLarge: 'This photo is too large to save. Try another photo.',
  failed: "Couldn't attach the photo. Please try again.",
  saveFailed: "Loan saved. Receipt couldn't be saved on this device.",
} as const;
