export interface MonitorEventImageRequest {
  timestamp: string | number;
  status: string;
  group?: string | null;
  title: string;
  message: string;
}

export type MonitorEventStatus =
  | "ALERT"
  | "WARN"
  | "OK"
  | "NO_DATA"
  | "UNKNOWN";