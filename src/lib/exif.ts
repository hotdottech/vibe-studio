import exifReader from "exif-reader";
import { Buffer } from "buffer";
import exifr from "exifr";
import deviceMappings from "@/data/DeviceMappings.json";
import type { ImageObject } from "@/types";

const DEVICE_MAP: Record<string, string> = deviceMappings as Record<string, string>;

function normalizeModel(rawModel: string | undefined): string {
  if (!rawModel) return "Unknown";
  const trimmed = rawModel.trim();
  const mapped = DEVICE_MAP[trimmed];
  if (mapped) return mapped;
  if (trimmed.toLowerCase().includes("iphone")) return trimmed;
  return "Unknown";
}

/** Aperture: number (1.77999) or string → "f/1.8" or "f/2". */
function getAperture(input: number | string | undefined): string {
  const val = Number(input);
  if (!(val > 0)) return "f/—";
  return `f/${Number.isInteger(val) ? val : val.toFixed(1)}`;
}

/** Shutter (seconds): small floats (0.0012) → "1/833s", >= 1 → "2.5s". */
export function getShutterSpeedDisplay(shutterSeconds: number): string {
  if (!(shutterSeconds > 0)) return "—";
  if (shutterSeconds < 1) return `1/${Math.round(1 / shutterSeconds)}s`;
  return `${shutterSeconds}s`;
}

/**
 * Extract APP1 Exif segment from JPEG ArrayBuffer.
 */
function getExifSegmentFromJpeg(arrayBuffer: ArrayBuffer): ArrayBuffer | null {
  const view = new DataView(arrayBuffer);
  let offset = 2;
  while (offset < arrayBuffer.byteLength - 1) {
    const marker = view.getUint16(offset, false);
    offset += 2;
    if (marker === 0xffe1) {
      const length = view.getUint16(offset, false);
      offset += 2;
      const payload = arrayBuffer.slice(offset, offset + length - 2);
      const header = new Uint8Array(payload, 0, 5);
      const tag = Array.from(header)
        .map((b) => String.fromCharCode(b))
        .join("");
      if (tag === "Exif\x00" || tag === "Exif") return payload;
      offset += length - 2;
    } else if (marker >= 0xffe0 && marker <= 0xffef) {
      const length = view.getUint16(offset, false);
      offset += 2 + length - 2;
    } else if (marker === 0xffda) break;
    else break;
  }
  return null;
}

export function hasNativeWatermarkFromDimensions(width: number, height: number): boolean {
  if (width <= 0) return false;
  return height / width > 1.45;
}

function buildMetaFromTags(
  tags: Record<string, unknown>,
  options: { width?: number; height?: number } = {}
): ImageObject["meta"] {
  const width = Number(tags.ImageWidth ?? tags.ExifImageWidth ?? 0) || (options.width ?? 0);
  const height = Number(tags.ImageLength ?? tags.ExifImageLength ?? 0) || (options.height ?? 0);

  const make = (tags.Make ?? "").toString().trim() || "Unknown";
  const model = normalizeModel((tags.Model ?? "").toString().trim());

  const fl35 =
    Number(tags.FocalLengthIn35mmFilm) ||
    Number(tags.FocalLengthIn35mmFormat) ||
    Number(tags.FocalLength35efl) ||
    Number(tags.focalLength35) ||
    Number(tags.FocalLength) ||
    0;
  const focalLength = fl35 > 0 ? fl35 : 24;

  const aperture = getAperture(tags.FNumber ?? undefined);

  const iso =
    Number(tags.ISOSpeedRatings) ||
    Number(tags.ISOSpeed) ||
    Number(tags.ISO) ||
    0;

  const et = Number(tags.ExposureTime) || 0;
  const shutter = et;

  let captureTime = new Date(0);
  const dto = tags.DateTimeOriginal ?? tags.CreateDate ?? tags.DateTime;
  if (dto) captureTime = dto instanceof Date ? dto : new Date(String(dto));

  const hasNativeWatermark = hasNativeWatermarkFromDimensions(width, height);

  const meta: ImageObject["meta"] = {
    make,
    model,
    focalLength,
    aperture,
    iso,
    shutter,
    captureTime,
    hasNativeWatermark,
  };
  console.log("Extracted Meta:", meta);
  return meta;
}

/**
 * Extract and normalize EXIF from a JPEG buffer.
 */
export function extractExif(arrayBuffer: ArrayBuffer): ImageObject["meta"] {
  const defaults: ImageObject["meta"] = {
    make: "",
    model: "Unknown",
    focalLength: 24,
    aperture: "f/—",
    iso: 0,
    shutter: 0,
    captureTime: new Date(0),
    hasNativeWatermark: false,
  };

  try {
    if (arrayBuffer.byteLength < 2) throw new Error("Too short");
    const view = new DataView(arrayBuffer);
    if (view.getUint8(0) !== 0xff || view.getUint8(1) !== 0xd8) throw new Error("Not JPEG");
    const segment = getExifSegmentFromJpeg(arrayBuffer);
    if (!segment) throw new Error("No EXIF segment");

    const exif = exifReader(Buffer.from(segment));
    const image = (exif?.Image ?? {}) as Record<string, unknown>;
    const photo = (exif?.Photo ?? {}) as Record<string, unknown>;
    const tags = { ...image, ...photo };
    return buildMetaFromTags(tags);
  } catch {
    console.log("Extracted Meta:", defaults);
    return defaults;
  }
}

/**
 * Extract EXIF from HEIC/HEIF (e.g. iPhone) using exifr.
 * Reads as ArrayBuffer first; uses aggressive parsing for full metadata.
 */
export async function extractExifFromHeic(
  input: ArrayBuffer | Blob | File
): Promise<ImageObject["meta"]> {
  const defaults: ImageObject["meta"] = {
    make: "",
    model: "Unknown",
    focalLength: 24,
    aperture: "f/—",
    iso: 0,
    shutter: 0,
    captureTime: new Date(0),
    hasNativeWatermark: false,
  };

  try {
    const buffer =
      input instanceof ArrayBuffer
        ? input
        : await new Promise<ArrayBuffer>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as ArrayBuffer);
            r.onerror = () => reject(r.error);
            r.readAsArrayBuffer(input instanceof Blob ? input : (input as File));
          });

    const raw = await exifr.parse(buffer, {
      tiff: true,
      ifd0: true,
      exif: true,
      makerNote: true,
      gps: false,
    });
    console.log("Raw HEIC Tags:", raw);

    if (!raw || typeof raw !== "object") throw new Error("No EXIF");
    const tags = raw as Record<string, unknown>;
    if (!tags.Model && tags.Make) tags.Model = tags.Make;
    return buildMetaFromTags(tags);
  } catch {
    console.log("Extracted Meta:", defaults);
    return defaults;
  }
}
