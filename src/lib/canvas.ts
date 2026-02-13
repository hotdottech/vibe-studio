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

const WHITE_THRESHOLD = 250;
const BLACK_THRESHOLD = 10;
const BOTTOM_FRACTION = 0.15;
const ROW_COVER_THRESHOLD = 0.9;

/**
 * Detect native watermark by pixel scanning the bottom 15% of the image.
 * If any row has >90% of pixels as pure white (>250) or pure black (<10), return true.
 */
export async function detectWatermark(img: HTMLImageElement): Promise<boolean> {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (iw <= 0 || ih <= 0) return false;

  const scanHeight = Math.max(1, Math.floor(ih * BOTTOM_FRACTION));
  const tw = Math.min(iw, 400);
  const th = Math.max(1, Math.min(scanHeight, 120));

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const tctx = canvas.getContext("2d");
  if (!tctx) return false;

  tctx.drawImage(img, 0, ih - scanHeight, iw, scanHeight, 0, 0, tw, th);

  const data = tctx.getImageData(0, 0, tw, th);
  const px = data.data;

  for (let row = 0; row < th; row++) {
    let whiteCount = 0;
    let blackCount = 0;
    for (let col = 0; col < tw; col++) {
      const i = (row * tw + col) * 4;
      const r = px[i]!;
      const g = px[i + 1]!;
      const b = px[i + 2]!;
      if (r > WHITE_THRESHOLD && g > WHITE_THRESHOLD && b > WHITE_THRESHOLD) whiteCount++;
      else if (r < BLACK_THRESHOLD && g < BLACK_THRESHOLD && b < BLACK_THRESHOLD) blackCount++;
    }
    if (whiteCount >= tw * ROW_COVER_THRESHOLD || blackCount >= tw * ROW_COVER_THRESHOLD) return true;
  }
  return false;
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

/** Center-crop (cover): same aspect as destination so 16:9 images are not stretched. */
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
  if (iw <= 0 || ih <= 0) return;
  const slotAspect = dw / dh;
  const imgAspect = iw / ih;
  let sx: number, sy: number, sw: number, sh: number;
  if (imgAspect > slotAspect) {
    sh = ih;
    sw = ih * slotAspect;
    sx = (iw - sw) / 2;
    sy = 0;
  } else {
    sw = iw;
    sh = iw / slotAspect;
    sx = 0;
    sy = (ih - sh) / 2;
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

  // Left slot: pixel-scan for native watermark (no aspect-ratio check)
  const leftHasWatermark = await detectWatermark(leftImg);
  if (leftHasWatermark) {
    centerCrop(ctx, leftImg, 0, 0, SLOT_WIDTH, H_4K);
  } else {
    centerCrop(ctx, leftImg, 0, 0, SLOT_WIDTH, contentH);
    drawFooter(ctx, left.meta, 0, contentH, SLOT_WIDTH, footerH, footerBg);
  }

  // Gutter
  ctx.fillStyle = "#000000";
  ctx.fillRect(GUTTER_X, 0, GUTTER_W, H_4K);

  // Right slot
  const rightHasWatermark = await detectWatermark(rightImg);
  if (rightHasWatermark) {
    centerCrop(ctx, rightImg, RIGHT_X, 0, SLOT_WIDTH, H_4K);
  } else {
    centerCrop(ctx, rightImg, RIGHT_X, 0, SLOT_WIDTH, contentH);
    drawFooter(ctx, right.meta, RIGHT_X, contentH, SLOT_WIDTH, footerH, footerBg);
  }
}
