/**
 * Data structures per Technical Specification Section 5.
 */

export interface ImageObject {
  id: string;
  file: File;
  url: string;
  embedding: number[];
  sceneId: string | null;
  meta: {
    make: string;
    model: string;
    focalLength: number;
    iso: number;
    shutter: number;
    captureTime: Date;
    hasNativeWatermark: boolean;
  };
}

export interface ComparisonPair {
  id: string;
  sceneId: string;
  leftImage: ImageObject;
  rightImage: ImageObject;
  layout: "side-by-side" | "stacked";
  zoomLabel: string;
}

export type LogLevel = "info" | "success" | "warn" | "error";

export interface LogEntry {
  id: string;
  message: string;
  level: LogLevel;
  timestamp: number;
}
