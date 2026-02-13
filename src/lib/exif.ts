import exifReader from "exif-reader";
import { Buffer } from "buffer";
import exifr from "exifr";
import deviceMappings from "@/data/DeviceMappings.json";
import type { ImageObject } from "@/types";

const DEVICE_MAP: Record<string, string> = deviceMappings as Record<string, string>;

function normalizeModel(rawModel: string | undefined): string {
  if (!rawModel) return "Unknown";
  const trimmed = rawModel.trim();
  return DEVICE_MAP[trimmed] ?? trimmed;
}

/**
 * Extract APP1 Exif segment from JPEG ArrayBuffer.
 * Returns null if not found.
 */
function getExifSegmentFromJpeg(arrayBuffer: ArrayBuffer): ArrayBuffer | null {
  const view = new DataView(arrayBuffer);
  let offset = 2; // Skip SOI (0xFFD8)
  while (offset < arrayBuffer.byteLength - 1) {
    const marker = view.getUint16(offset, false);
    offset += 2;
    if (marker === 0xffe1) {
      // APP1
      const length = view.getUint16(offset, false);
      offset += 2;
      const payload = arrayBuffer.slice(offset, offset + length - 2);
      const header = new Uint8Array(payload, 0, 5);
      const tag = Array.from(header)
        .map((b) => String.fromCharCode(b))
        .join("");
      if (tag === "Exif\x00" || tag === "Exif") {
        return payload;
      }
      offset += length - 2;
    } else if (marker >= 0xffe0 && marker <= 0xffef) {
      const length = view.getUint16(offset, false);
      offset += 2 + length - 2;
    } else if (marker === 0xffda) {
      break; // SOS – start of stream, no more markers
    } else {
      break;
    }
  }
  return null;
}

/**
 * Detect native watermark from aspect ratio (Spec 3.1).
 * Ratio > 1.45 -> Tall (Has Watermark).
 */
export function hasNativeWatermarkFromDimensions(width: number, height: number): boolean {
  if (width <= 0) return false;
  const ratio = height / width;
  return ratio > 1.45;
}

/**
 * Extract and normalize EXIF from a JPEG buffer.
 * Accepts the raw bytes of a JPEG (e.g. from a File or from a HEIC-converted Blob).
 * HEIC→JPEG conversion often strips EXIF; in that case defaults are returned.
 * Dimensions for watermark detection come from EXIF ImageWidth/ImageLength when present.
 */
export function extractExif(arrayBuffer: ArrayBuffer): ImageObject["meta"] {
  let make = "";
  let model = "Unknown";
  let focalLength = 24;
  let iso = 0;
  let shutter = 0;
  let captureTime = new Date(0);
  let width = 0;
  let height = 0;

  try {
    if (arrayBuffer.byteLength < 2) throw new Error("Too short");
    const view = new DataView(arrayBuffer);
    if (view.getUint8(0) !== 0xff || view.getUint8(1) !== 0xd8) throw new Error("Not JPEG");
    const segment = getExifSegmentFromJpeg(arrayBuffer);
    if (!segment) throw new Error("No EXIF segment");

    const buf = Buffer.from(segment);
    const exif = exifReader(buf);
    const image = exif?.Image;
    const photo = exif?.Photo;

    make = (image?.Make ?? "").toString().trim() || "Unknown";
    model = normalizeModel((image?.Model ?? "").toString().trim());

    const fl = photo?.FocalLength ?? image?.FocalLength ?? 24;
    focalLength = typeof fl === "number" ? fl : 24;
    iso = Number(photo?.ISOSpeedRatings ?? 0) || 0;
    const et = photo?.ExposureTime ?? image?.ExposureTime;
    shutter = typeof et === "number" ? et : 0;
    const dto = photo?.DateTimeOriginal ?? image?.DateTime;
    if (dto) captureTime = dto instanceof Date ? dto : new Date(String(dto));

    width = Number(image?.ImageWidth ?? 0) || 0;
    height = Number(image?.ImageLength ?? 0) || 0;
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

/**
 * Extract EXIF from HEIC/HEIF buffer (e.g. iPhone photos) using exifr.
 * Use this on the ORIGINAL HEIC file before converting to JPEG, so metadata
 * is preserved for the footer (model, ISO, shutter, etc.).
 */
export async function extractExifFromHeic(
  input: ArrayBuffer | Blob | File
): Promise<ImageObject["meta"]> {
  let make = "";
  let model = "Unknown";
  let focalLength = 24;
  let iso = 0;
  let shutter = 0;
  let captureTime = new Date(0);
  let width = 0;
  let height = 0;

  try {
    const raw = await exifr.parse(input, { pick: ["Make", "Model", "FocalLength", "ISO", "ExposureTime", "DateTimeOriginal", "ImageWidth", "ImageHeight", "ExifImageWidth", "ExifImageHeight"] });
    if (!raw || typeof raw !== "object") throw new Error("No EXIF");

    make = (raw.Make ?? "").toString().trim() || "Unknown";
    model = normalizeModel((raw.Model ?? "").toString().trim());
    const fl = raw.FocalLength ?? raw.FocalLengthIn35mmFormat ?? 24;
    focalLength = typeof fl === "number" ? fl : 24;
    iso = Number(raw.ISO ?? 0) || 0;
    shutter = Number(raw.ExposureTime ?? 0) || 0;
    const dto = raw.DateTimeOriginal ?? raw.CreateDate;
    if (dto) captureTime = dto instanceof Date ? dto : new Date(String(dto));
    width = Number(raw.ImageWidth ?? raw.ExifImageWidth ?? 0) || 0;
    height = Number(raw.ImageHeight ?? raw.ExifImageHeight ?? 0) || 0;
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
