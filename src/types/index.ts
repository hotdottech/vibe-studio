/**
 * Data structures per Technical Specification Section 5.
 */

/** Section 5.1 – The Image Object */
export interface ImageObject {
  id: string; // UUID
  file: File; // Raw blob
  url: string; // ObjectURL for preview
  embedding: number[]; // CLIP Vector
  sceneId: string | null; // Cluster ID
  meta: {
    make: string;
    model: string; // Normalized name
    focalLength: number;
    iso: number;
    shutter: number;
    captureTime: Date;
    hasNativeWatermark: boolean; // Result of detection logic
  };
}

/** Section 5.2 – The Pair Object */
export interface ComparisonPair {
  id: string;
  sceneId: string;
  leftImage: ImageObject;
  rightImage: ImageObject;
  layout: "side-by-side" | "stacked";
  zoomLabel: string; // "5X", "1X"
}

export type LogLevel = "info" | "success" | "warn" | "error";

export interface LogEntry {
  id: string;
  message: string;
  level: LogLevel;
  timestamp: number;
}
