import exifReader from "exif-reader";
import deviceMappings from "@/data/DeviceMappings.json";

export type RawExif = {
  make?: string;
  model?: string;
  focalLength?: number;
  fNumber?: number;
  iso?: number;
  exposureTime?: number;
  dateTimeOriginal?: string;
};

const DEVICE_MAP: Record<string, string> = deviceMappings as Record<string, string>;

function normalizeModel(rawModel: string | undefined): string {
  if (!rawModel) return "Unknown";
  const trimmed = rawModel.trim();
  return DEVICE_MAP[trimmed] ?? trimmed;
}

/**
 * Detect native watermark from aspect ratio (Spec 3.1).
 * Ratio > 1.45 -> Tall (Has Watermark). Otherwise no native watermark.
 */
export function hasNativeWatermarkFromDimensions(width: number, height: number): boolean {
  if (width <= 0) return false;
  const ratio = height / width;
  return ratio > 1.45;
}

/**
 * Extract and normalize EXIF into meta shape for ImageObject.
 */
export function extractExif(
  buffer: ArrayBuffer,
  width: number,
  height: number
): ImageObject["meta"] {
  let make = "";
  let model = "Unknown";
  let focalLength = 24;
  let iso = 0;
  let shutter = 0;
  let captureTime = new Date(0);

  try {
    const exif = exifReader(buffer);
    const image = exif?.Image || {};
    const exifIfd = exif?.Exif || {};
    const tiff = exif?.tiff || {};

    make = (tiff.Make ?? image.Make ?? "").toString().trim() || "Unknown";
    const rawModel = (tiff.Model ?? image.Model ?? "").toString().trim();
    model = normalizeModel(rawModel);

    focalLength = exifIfd.FocalLength ?? image.FocalLength ?? 24;
    if (typeof focalLength === "object" && "numerator" in focalLength) {
      focalLength = (focalLength as { numerator: number; denominator: number }).numerator;
    }
    iso = exifIfd.ISOSpeedRatings ?? exifIfd.ISO ?? 0;
    const et = exifIfd.ExposureTime;
    if (typeof et === "object" && "numerator" in et) {
      shutter = (et as { numerator: number; denominator: number }).denominator
        ? (et as { numerator: number; denominator: number }).numerator /
          (et as { numerator: number; denominator: number }).denominator
        : 0;
    } else if (typeof et === "number") {
      shutter = et;
    }
    const dto = exifIfd.DateTimeOriginal ?? image.DateTime;
    if (dto) captureTime = new Date(dto);
  } catch {
    // No EXIF or parse error: use defaults
  }

  const hasNativeWatermark = hasNativeWatermarkFromDimensions(width, height);

  return {
    make,
    model,
    focalLength: Number(focalLength) || 24,
    iso: Number(iso) || 0,
    shutter: Number(shutter) || 0,
    captureTime,
    hasNativeWatermark,
  };
}
