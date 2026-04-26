/**
 * Error thrown when validation of input parameters fails.
 */
export class ValidationError extends Error {
  /**
   * HTTP status code associated with the error.
   */
  public status: number;

  /**
   * Creates a new instance of ValidationError.
   *
   * @param message - The error message.
   * @param status - The HTTP status code (defaults to 400).
   */
  constructor(message: string, status: number = 400) {
    super(message);
    this.name = 'ValidationError';
    this.status = status;

    // Restore prototype chain
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
