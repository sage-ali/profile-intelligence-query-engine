/**
 * Error thrown when an external API request fails or returns an error response.
 */
export class ExternalApiError extends Error {
  /**
   * HTTP status code associated with the error.
   */
  public status: number;

  /**
   * The name of the external service that failed.
   */
  public serviceName?: string;

  /**
   * Creates a new instance of ExternalApiError.
   *
   * @param message - The error message.
   * @param status - The HTTP status code (defaults to 502).
   * @param serviceName - Optional name of the external service.
   */
  constructor(message: string, status: number = 502, serviceName?: string) {
    super(message);
    this.name = 'ExternalApiError';
    this.status = status;
    this.serviceName = serviceName;
  }
}
