export interface StandardResponse<T = unknown> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path: string;
  [key: string]: unknown;
}

export interface StandardErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  data: null;
  timestamp: string;
  path: string;
  [key: string]: unknown;
}
