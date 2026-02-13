/**
 * Lens deduction from focal length (Spec 2.4)
 */
export function getZoomLabel(focalLengthMm: number): string {
  if (focalLengthMm < 18) return "UW";
  if (focalLengthMm >= 18 && focalLengthMm < 35) return "1X";
  if (focalLengthMm >= 35 && focalLengthMm < 85) return "3X";
  if (focalLengthMm >= 85) return "5X";
  return "1X";
}

/** Format for footer: "24mm (1X)" */
export function getLensLabel(focalLengthMm: number): string {
  const zoom = getZoomLabel(focalLengthMm);
  const mm = Math.round(focalLengthMm);
  return `${mm}mm (${zoom})`;
}
