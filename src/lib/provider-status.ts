export type ProviderStatus =
  | "SUCCESS"
  | "PENDING"
  | "FAILED"
  | "UNCONFIGURED"
  | "RETRYABLE_FAILED"
  | "PROVIDER_UNAVAILABLE"
  | "RAW_TEXT_REQUIRED";

export class ProviderExecutionError extends Error {
  readonly providerStatus: ProviderStatus;
  readonly statusCode: number;
  readonly provider?: string;

  constructor(message: string, providerStatus: ProviderStatus, options: { statusCode?: number; provider?: string } = {}) {
    super(message);
    this.name = "ProviderExecutionError";
    this.providerStatus = providerStatus;
    this.statusCode = options.statusCode ?? statusCodeForProviderStatus(providerStatus);
    this.provider = options.provider;
  }
}

export function statusCodeForProviderStatus(status: ProviderStatus): number {
  switch (status) {
    case "UNCONFIGURED":
      return 503;
    case "PROVIDER_UNAVAILABLE":
    case "RETRYABLE_FAILED":
      return 502;
    case "RAW_TEXT_REQUIRED":
      return 422;
    case "PENDING":
      return 202;
    case "FAILED":
      return 502;
    case "SUCCESS":
      return 200;
  }
}

export function isProviderExecutionError(error: unknown): error is ProviderExecutionError {
  return error instanceof ProviderExecutionError;
}
