import type { ApiError } from '@foldify/shared';

/**
 * The only error type routes should throw. The error handler turns it into the
 * `ApiResponse` envelope; anything else becomes a generic 500 with no detail
 * leaked to the client.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string> | undefined;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  toApiError(): ApiError {
    return this.fields
      ? { code: this.code, message: this.message, fields: this.fields }
      : { code: this.code, message: this.message };
  }

  static badRequest(message: string, fields?: Record<string, string>): AppError {
    return new AppError(400, 'BAD_REQUEST', message, fields);
  }

  static unauthorized(message = 'You must be signed in.'): AppError {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'You do not have access to that.'): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Not found.'): AppError {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string): AppError {
    return new AppError(409, 'CONFLICT', message);
  }

  static notImplemented(message = 'This endpoint is not built yet.'): AppError {
    return new AppError(501, 'NOT_IMPLEMENTED', message);
  }
}
