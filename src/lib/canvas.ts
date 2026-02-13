/**
 * Comparison rendering and Hybrid Watermark Engine (Spec 3 & 4).
 * 4K canvas, side-by-side layout, custom footer when no native watermark.
 */

import type { ImageObject } from "@/types";
import { getLensLabel } from "@/lib/lens";

const W_4K = 3840;
const H_4K = 2160;
const SLOT_WIDTH = 1915;
const GUTTER_X = 1915;
const GUTTER_W = 10;
const RIGHT_X = 1925;
const FOOTER_RATIO = 0.12; // 12% of image height (Spec 3.2)
const PAD_RATIO = 0.03; // 3% padding

/** Spec 3.1: Ratio > 1.45 => Tall (Has Watermark). Else standard → custom footer. */
export function detectWatermark(width: number, height: number): boolean {
  if (width <= 0) return false;
  const ratio = height / width;
  return ratio > 1.45;
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

  // Right: focal + f/— and 1/shutter + ISO
  const rightX = divX + pad;
  const line2Y = y + height * 0.65;
  ctx.font = `${baseSize * 0.9}px ${fontFamily}`;

  const line1 = `${getLensLabel(meta.focalLength)} · f/—`;
  ctx.fillText(line1, rightX, y + height * 0.35);

  const shutterText = meta.shutter > 0 ? `1/${Math.round(1 / meta.shutter)}s` : "—";
  const line2 = `${shutterText}  ISO ${meta.iso || "—"}`;
  ctx.fillText(line2, rightX, line2Y);
}

function centerCrop(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
): void {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(dw / iw, dh / ih);
  const sw = iw * scale;
  const sh = ih * scale;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;
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

  // Left slot: 0, 0, SLOT_WIDTH, H_4K
  const leftHasWatermark = left.meta.hasNativeWatermark ?? detectWatermark(leftImg.naturalWidth, leftImg.naturalHeight);
  if (leftHasWatermark) {
    centerCrop(ctx, leftImg, 0, 0, SLOT_WIDTH, H_4K);
  } else {
    centerCrop(ctx, leftImg, 0, 0, SLOT_WIDTH, contentH);
    drawFooter(ctx, left.meta, 0, contentH, SLOT_WIDTH, footerH, footerBg);
  }

  // Gutter
  ctx.fillStyle = "#000000";
  ctx.fillRect(GUTTER_X, 0, GUTTER_W, H_4K);

  // Right slot: RIGHT_X, 0, SLOT_WIDTH, H_4K
  const rightHasWatermark = right.meta.hasNativeWatermark ?? detectWatermark(rightImg.naturalWidth, rightImg.naturalHeight);
  if (rightHasWatermark) {
    centerCrop(ctx, rightImg, RIGHT_X, 0, SLOT_WIDTH, H_4K);
  } else {
    centerCrop(ctx, rightImg, RIGHT_X, 0, SLOT_WIDTH, contentH);
    drawFooter(ctx, right.meta, RIGHT_X, contentH, SLOT_WIDTH, footerH, footerBg);
  }
}
