/**
 * Comparison rendering and Hybrid Watermark Engine (Spec 3 & 4).
 * 4K canvas, side-by-side layout, custom footer when no native watermark.
 */

import type { ImageObject } from "@/types";
import { getLensLabel } from "@/lib/lens";
import { getShutterSpeedDisplay } from "@/lib/exif";

const W_4K = 3840;
const H_4K = 2160;
const SLOT_WIDTH = 1915;
const GUTTER_X = 1915;
const GUTTER_W = 10;
const RIGHT_X = 1925;
const FOOTER_RATIO = 0.12; // 12% of image height (Spec 3.2)
const PAD_RATIO = 0.03; // 3% padding

const WHITE_THRESHOLD = 230; // lowered for JPEG compression; check r,g,b individually to avoid color casts
const MAX_FOOTER_FRACTION = 0.2; // stop scanning after 20% of image height

/**
 * Get native (white) footer height by scanning rows from the bottom upward.
 * Stops at 20% of image height or on first non–solid-white row.
 * Returns height in original image pixels (for use in source crop).
 */
export function getNativeFooterHeight(img: HTMLImageElement): number {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (iw <= 0 || ih <= 0) return 0;

  const maxScanRows = Math.floor(ih * MAX_FOOTER_FRACTION);
  if (maxScanRows <= 0) return 0;

  const tw = Math.min(iw, 400);
  const th = Math.max(1, Math.min(ih, Math.ceil((tw / iw) * ih)));
  const maxScanInSample = Math.min(th, Math.ceil((maxScanRows / ih) * th));

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const tctx = canvas.getContext("2d");
  if (!tctx) return 0;

  tctx.drawImage(img, 0, 0, iw, ih, 0, 0, tw, th);
  const data = tctx.getImageData(0, 0, tw, th);
  const px = data.data;

  let footerRows = 0;
  for (let r = th - 1; r >= th - maxScanInSample && r >= 0; r--) {
    let sumR = 0, sumG = 0, sumB = 0;
    for (let c = 0; c < tw; c++) {
      const i = (r * tw + c) * 4;
      sumR += px[i]!;
      sumG += px[i + 1]!;
      sumB += px[i + 2]!;
    }
    const avgR = sumR / tw;
    const avgG = sumG / tw;
    const avgB = sumB / tw;
    if (avgR > WHITE_THRESHOLD && avgG > WHITE_THRESHOLD && avgB > WHITE_THRESHOLD) {
      // each channel > 230 to avoid color casts from JPEG artifacts
      footerRows++;
    } else {
      break;
    }
  }

  return Math.round((footerRows / th) * ih);
}

type FooterBg = "white" | "black";

/** Spec 3.2: Custom footer – model name left; focal, shutter, ISO right. */
export function drawFooter(
  ctx: CanvasRenderingContext2D,
  meta: ImageObject["meta"],
  x: number,
  y: number,
  width: number,
  height: number,
  bg: FooterBg
): void {
  const isLight = bg === "white";
  ctx.fillStyle = isLight ? "#FFFFFF" : "#000000";
  ctx.fillRect(x, y, width, height);

  const pad = width * PAD_RATIO;
  const textColor = isLight ? "#000000" : "#FFFFFF";
  ctx.fillStyle = textColor;
  ctx.strokeStyle = textColor;

  const fontFamily = "Inter, system-ui, -apple-system, sans-serif";
  const baseSize = Math.min(32, (height * 0.4));
  ctx.font = `bold ${baseSize}px ${fontFamily}`;
  ctx.textBaseline = "middle";

  // Left: model name
  const modelText = meta.model || "Unknown";
  ctx.fillText(modelText, x + pad, y + height / 2);

  // Divider (vertical line)
  const divX = x + width * 0.55;
  ctx.strokeStyle = isLight ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(divX, y + height * 0.15);
  ctx.lineTo(divX, y + height * 0.85);
  ctx.stroke();
  ctx.strokeStyle = textColor;

  // Right: focal + aperture and shutter + ISO
  const rightX = divX + pad;
  const line2Y = y + height * 0.65;
  ctx.font = `${baseSize * 0.9}px ${fontFamily}`;

  const line1 = `${getLensLabel(meta.focalLength)} · ${meta.aperture}`;
  ctx.fillText(line1, rightX, y + height * 0.35);

  const line2 = `${getShutterSpeedDisplay(meta.shutter)}  ISO ${meta.iso || "—"}`;
  ctx.fillText(line2, rightX, line2Y);
}

/** Draw image with top portion only (0, 0, iw, sourceHeight) into slot, center-crop. Unified custom footer drawn below. */
function centerCropFromSource(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  sourceHeight: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number
): void {
  const iw = img.naturalWidth;
  if (iw <= 0 || sourceHeight <= 0) return;
  const slotAspect = dw / dh;
  const imgAspect = iw / sourceHeight;
  let sx: number, sy: number, sw: number, sh: number;
  if (imgAspect > slotAspect) {
    sh = sourceHeight;
    sw = sourceHeight * slotAspect;
    sx = (iw - sw) / 2;
    sy = 0;
  } else {
    sw = iw;
    sh = iw / slotAspect;
    sx = 0;
    sy = (sourceHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export type LayoutMode = "side-by-side";

export type DrawComparisonOptions = {
  footerBg?: FooterBg;
};

/**
 * Draw full 4K comparison to the given context.
 * Canvas must be 3840x2160. Loads images, draws side-by-side with optional footers.
 */
export async function drawComparison(
  ctx: CanvasRenderingContext2D,
  left: ImageObject,
  right: ImageObject,
  layout: LayoutMode,
  options: DrawComparisonOptions = {}
): Promise<void> {
  const footerBg = options.footerBg ?? "black";
  const canvas = ctx.canvas;
  if (canvas.width !== W_4K || canvas.height !== H_4K) {
    canvas.width = W_4K;
    canvas.height = H_4K;
  }

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, W_4K, H_4K);

  const [leftImg, rightImg] = await Promise.all([
    loadImage(left.url),
    loadImage(right.url),
  ]);

  const slotH = H_4K;
  const footerH = Math.round(slotH * FOOTER_RATIO);
  const contentH = slotH - footerH;

  // Smart crop: detect native white footer height per image, crop it off, then ALWAYS draw unified custom footer (mapped names e.g. iPhone 17 Pro Max).
  const leftFooterPx = getNativeFooterHeight(leftImg);
  const leftSourceH = Math.max(1, leftImg.naturalHeight - leftFooterPx);
  centerCropFromSource(ctx, leftImg, leftSourceH, 0, 0, SLOT_WIDTH, contentH);
  drawFooter(ctx, left.meta, 0, contentH, SLOT_WIDTH, footerH, footerBg);

  ctx.fillStyle = "#000000";
  ctx.fillRect(GUTTER_X, 0, GUTTER_W, H_4K);

  const rightFooterPx = getNativeFooterHeight(rightImg);
  const rightSourceH = Math.max(1, rightImg.naturalHeight - rightFooterPx);
  centerCropFromSource(ctx, rightImg, rightSourceH, RIGHT_X, 0, SLOT_WIDTH, contentH);
  drawFooter(ctx, right.meta, RIGHT_X, contentH, SLOT_WIDTH, footerH, footerBg);
}
