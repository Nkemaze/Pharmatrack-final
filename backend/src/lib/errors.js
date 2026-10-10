export const ErrorCodes = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  RATE_LIMITED: 'RATE_LIMITED',
  FORBIDDEN: 'FORBIDDEN',
  TENANT_SCOPE: 'TENANT_SCOPE',
  ACCOUNT_BLOCKED: 'ACCOUNT_BLOCKED',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NEGATIVE_STOCK: 'NEGATIVE_STOCK',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

const STATUS = {
  [ErrorCodes.AUTH_REQUIRED]: 401,
  [ErrorCodes.TOKEN_EXPIRED]: 401,
  [ErrorCodes.TOKEN_REVOKED]: 401,
  [ErrorCodes.INVALID_CREDENTIALS]: 401,
  [ErrorCodes.RATE_LIMITED]: 429,
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.TENANT_SCOPE]: 403,
  [ErrorCodes.ACCOUNT_BLOCKED]: 403,
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.CONFLICT]: 409,
  [ErrorCodes.VALIDATION_ERROR]: 422,
  [ErrorCodes.NEGATIVE_STOCK]: 422,
  [ErrorCodes.INTERNAL_ERROR]: 500,
};

export const statusFor = (code) => STATUS[code] ?? 500;

const MESSAGES = {
  [ErrorCodes.AUTH_REQUIRED]: 'Authentication required',
  [ErrorCodes.TOKEN_EXPIRED]: 'Access token expired',
  [ErrorCodes.TOKEN_REVOKED]: 'Access token has been revoked',
  [ErrorCodes.INVALID_CREDENTIALS]: 'Invalid credentials',
  [ErrorCodes.RATE_LIMITED]: 'Too many attempts, try again later',
  [ErrorCodes.FORBIDDEN]: 'You are not allowed to perform this action',
  [ErrorCodes.TENANT_SCOPE]: 'Resource belongs to another pharmacy',
  [ErrorCodes.ACCOUNT_BLOCKED]: 'Account is not active',
  [ErrorCodes.NOT_FOUND]: 'Resource not found',
  [ErrorCodes.CONFLICT]: 'Resource conflict',
  [ErrorCodes.VALIDATION_ERROR]: 'Validation failed',
  [ErrorCodes.NEGATIVE_STOCK]: 'Operation would drive batch stock below zero',
  [ErrorCodes.INTERNAL_ERROR]: 'Internal server error',
};

export class AppError extends Error {
  constructor(code, message, options = {}) {
    super(message ?? MESSAGES[code] ?? code);
    this.name = 'AppError';
    this.code = code;
    this.status = options.status ?? statusFor(code);
    if (options.details) this.details = options.details;
  }
}
