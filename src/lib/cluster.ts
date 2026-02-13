/**
 * Intelligence Engine clustering (Spec 2.3).
 * Cosine similarity; threshold > 0.92 = same scene; assign sceneId per cluster.
 */

/** Cosine similarity between two vectors (assumes non-zero length). */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  const norm = Math.sqrt(normA) * Math.sqrt(normB);
  return norm === 0 ? 0 : dot / norm;
}

/** Union-Find for grouping. */
class UnionFind {
  private parent: Map<string, string> = new Map();

  find(id: string): string {
    if (!this.parent.has(id)) this.parent.set(id, id);
    let p = this.parent.get(id)!;
    if (p !== id) {
      p = this.find(p);
      this.parent.set(id, p);
    }
    return p;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

export type ImageWithEmbedding = { id: string; embedding: number[] };

/**
 * Group images by cosine similarity >= threshold (Spec: > 0.92 = same scene).
 * Returns a map from image id to sceneId (cluster root id).
 */
export function clusterBySimilarity(
  images: ImageWithEmbedding[],
  threshold: number = 0.92
): Map<string, string> {
  const uf = new UnionFind();
  for (let i = 0; i < images.length; i++) {
    for (let j = i + 1; j < images.length; j++) {
      const sim = cosineSimilarity(images[i]!.embedding, images[j]!.embedding);
      if (sim > threshold) uf.union(images[i]!.id, images[j]!.id);
    }
  }
  const sceneMap = new Map<string, string>();
  for (const img of images) {
    sceneMap.set(img.id, uf.find(img.id));
  }
  return sceneMap;
}
