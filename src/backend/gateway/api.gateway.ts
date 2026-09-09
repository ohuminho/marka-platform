export interface ApiRequest {
  path: string;
  method: string;
  body?: unknown;
}

export interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}
