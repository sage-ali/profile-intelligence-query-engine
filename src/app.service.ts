import { Injectable } from '@nestjs/common';

/**
 * Service providing core application logic for the root controller.
 */
@Injectable()
export class AppService {
  /**
   * Returns a standard welcome message.
   *
   * @returns The welcome message string.
   */
  getHello(): string {
    return 'Hello World!';
  }
}
