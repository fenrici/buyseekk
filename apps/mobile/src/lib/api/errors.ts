export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'RATE_LIMIT'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'SERVER'
  | 'UNKNOWN';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;
  readonly details?: string[];

  constructor(
    code: ApiErrorCode,
    message: string,
    opts?: { status?: number; details?: string[]; cause?: unknown },
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = opts?.status;
    this.details = opts?.details;
    if (opts?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = opts.cause;
    }
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** True when the refresh token must be discarded (revoked / expired / invalid). */
export function isInvalidSessionError(error: unknown): boolean {
  return isApiError(error) && error.code === 'UNAUTHORIZED' && error.status === 401;
}

/** Transient failures — do NOT clear a valid SecureStore refresh. */
export function isRetriableTransportError(error: unknown): boolean {
  return isApiError(error) && (error.code === 'NETWORK' || error.code === 'TIMEOUT' || error.code === 'SERVER');
}

export function userFacingMessage(error: unknown, fallback = 'Algo salió mal. Intentá de nuevo.'): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error && error.message) return fallback;
  return fallback;
}

function codeFromStatus(status: number): ApiErrorCode {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 422 || status === 400) return 'VALIDATION';
  if (status === 429) return 'RATE_LIMIT';
  if (status >= 500) return 'SERVER';
  return 'UNKNOWN';
}

function friendlyFallback(code: ApiErrorCode): string {
  switch (code) {
    case 'UNAUTHORIZED':
      return 'Credenciales inválidas';
    case 'CONFLICT':
      return 'Ese email ya está registrado';
    case 'VALIDATION':
      return 'Revisá los datos e intentá de nuevo';
    case 'RATE_LIMIT':
      return 'Demasiados intentos. Esperá un momento.';
    case 'NETWORK':
      return 'Sin conexión. Revisá tu internet e intentá de nuevo.';
    case 'TIMEOUT':
      return 'La solicitud tardó demasiado. Intentá de nuevo.';
    case 'SERVER':
      return 'El servidor no responde. Intentá más tarde.';
    case 'FORBIDDEN':
      return 'No tenés permiso para esta acción';
    default:
      return 'Algo salió mal. Intentá de nuevo.';
  }
}

/**
 * Parse NestJS-style JSON error bodies into a user-safe ApiError.
 * Never exposes stack traces or internal diagnostics.
 */
export function parseApiErrorBody(status: number, body: unknown): ApiError {
  const code = codeFromStatus(status);
  let message = friendlyFallback(code);
  let details: string[] | undefined;

  if (body && typeof body === 'object') {
    const data = body as { message?: unknown; error?: unknown };
    if (Array.isArray(data.message)) {
      details = data.message.filter((m): m is string => typeof m === 'string');
      if (details.length > 0) message = details.join(', ');
    } else if (typeof data.message === 'string' && data.message.trim()) {
      message = data.message.trim();
    } else if (typeof data.error === 'string' && data.error.trim() && code === 'UNKNOWN') {
      message = friendlyFallback(code);
    }
  }

  // Soften generic Nest labels
  if (message === 'Unauthorized') message = friendlyFallback('UNAUTHORIZED');
  if (message === 'Conflict') message = friendlyFallback('CONFLICT');
  if (message === 'Bad Request') message = friendlyFallback('VALIDATION');

  return new ApiError(code, message, { status, details });
}

export function networkApiError(cause?: unknown): ApiError {
  return new ApiError('NETWORK', friendlyFallback('NETWORK'), { cause });
}

export function timeoutApiError(cause?: unknown): ApiError {
  return new ApiError('TIMEOUT', friendlyFallback('TIMEOUT'), { cause });
}
