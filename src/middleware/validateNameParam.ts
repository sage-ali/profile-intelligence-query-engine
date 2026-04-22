import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../errors/ValidationError';

/**
 * Express middleware for validating the 'name' query parameter.
 *
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @param next - The Express next function.
 * @throws {ValidationError} If the 'name' parameter is missing, empty, or not a string.
 */
export const validateNameParam = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { name } = req.query;

  if (name === undefined || (typeof name === 'string' && name.trim() === '')) {
    return next(
      new ValidationError(
        'Name query parameter is required and cannot be empty',
        400,
      ),
    );
  }

  if (
    typeof name !== 'string' ||
    Array.isArray(name) ||
    typeof name === 'object'
  ) {
    return next(
      new ValidationError('Name query parameter must be a string', 422),
    );
  }

  next();
};
