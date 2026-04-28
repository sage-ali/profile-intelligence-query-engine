import { Controller, Get, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@core/decorators/public.decorator';

/**
 * Controller providing health check and basic application endpoints.
 */
@Controller()
@ApiTags('health')
@Public()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  /**
   * Initializes the AppController.
   *
   * @param appService - The application service.
   */
  constructor(private readonly appService: AppService) {}

  /**
   * Root health check endpoint.
   *
   * @returns A welcome message from the application.
   */
  @Get()
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Returns a welcome message indicating the API is running.',
  })
  @ApiResponse({ status: 200, description: 'API is running' })
  getHello() {
    return {
      status: 'success',
      data: { message: this.appService.getHello() },
    };
  }

  /**
   * Detailed health check endpoint.
   *
   * @returns An object indicating the health status of the service.
   */
  @Get('health')
  @ApiOperation({
    summary: 'Service health status',
    description: 'Returns the health status of the service.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: { example: { status: 'success', data: { health: 'ok' } } },
  })
  getHealth() {
    return {
      status: 'success',
      data: { health: 'ok' },
    };
  }
}
