export interface TraceRecord {
  id: string;
  type: string;
  model: string;
  prompt: string;
  response?: unknown;
  metadata?: unknown;
  createdAt: string;
}

export interface TraceListResponse {
  traces: TraceRecord[];
}
