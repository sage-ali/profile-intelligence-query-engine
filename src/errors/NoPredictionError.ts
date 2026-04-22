/**
 * Error thrown when an external API cannot provide a prediction for the input.
 */
export class NoPredictionError extends Error {
  /**
   * HTTP status code associated with the error.
   */
  public status: number;

  /**
   * Creates a new instance of NoPredictionError.
   *
   * @param message - The error message.
   * @param status - The HTTP status code (defaults to 422).
   */
  constructor(message: string, status: number = 422) {
    super(message);
    this.name = 'NoPredictionError';
    this.status = status;

    // Restore prototype chain
    Object.setPrototypeOf(this, NoPredictionError.prototype);
  }
}
