/**
 * Generate a simple hash for deduplication: file name + size + lastModified
 * (Spec 2.1 - prevent duplicate imports)
 */
export function fileDedupeKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}
