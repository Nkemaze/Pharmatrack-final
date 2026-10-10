import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError, ErrorCodes } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export function notFound(req, res) {
  res.status(404).json({
    error: {
      code: ErrorCodes.NOT_FOUND,
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Validation failed',
        details: err.issues.map((issue) => ({
          field: issue.path.join('.') || '<body>',
          message: issue.message,
        })),
      },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: {
          code: ErrorCodes.CONFLICT,
          message: `Duplicate value for ${(err.meta?.target ?? []).join(', ') || 'field'}`,
        },
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: { code: ErrorCodes.NOT_FOUND, message: 'Resource not found' },
      });
    }
  }

  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    error: { code: ErrorCodes.INTERNAL_ERROR, message: 'Internal server error' },
  });
}