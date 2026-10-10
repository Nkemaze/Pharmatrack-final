import { ZodError } from 'zod';
import { AppError, ErrorCodes } from '../lib/errors.js';

/**
 * Validates a request against Zod schemas. Parsed values are stored on
 * `req.validated.{body,query,params}` (never mutating Express getters).
 */
export const validate = (schemas = {}) => (req, _res, next) => {
  try {
    req.validated = {};
    if (schemas.body) req.validated.body = schemas.body.parse(req.body ?? {});
    if (schemas.query) req.validated.query = schemas.query.parse(req.query ?? {});
    if (schemas.params) req.validated.params = schemas.params.parse(req.params ?? {});
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      return next(
        new AppError(ErrorCodes.VALIDATION_ERROR, 'Validation failed', {
          details: err.issues.map((issue) => ({
            field: issue.path.join('.') || '<body>',
            message: issue.message,
          })),
        }),
      );
    }
    next(err);
  }
};