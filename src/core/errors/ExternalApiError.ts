/**
 * Error thrown when an external API request fails or returns an error response.
 */
export class ExternalApiError extends Error {
  /**
   * HTTP status code associated with the error.
   */
  public status: number;

  /**
   * Creates a new instance of ExternalApiError.
   *
   * @param message - The error message.
   * @param status - The HTTP status code (defaults to 502).
   */
  constructor(message: string, status: number = 502) {
    super(message);
    this.name = 'ExternalApiError';
    this.status = status;

    // Restore prototype chain
    Object.setPrototypeOf(this, ExternalApiError.prototype);
  }
}
