import { Request, Response, NextFunction } from 'express';

/**
 * Express middleware for handling global application errors.
 *
 * @param err - The error object.
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @param next - The Express next function.
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
) => {
  console.error(err.stack); // Log the error stack for debugging

  const statusCode = 500;
  const message = err.message || 'An unexpected error occurred';

  res.status(statusCode).json({
    status: 'error',
    message: message,
  });
};
