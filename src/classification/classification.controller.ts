import { Controller, Get, Query, UseFilters } from '@nestjs/common';
import { ClassificationService } from './classification.service';
import { ClassificationQueryDto } from './dto/classification-query.dto';
import { HttpExceptionFilter } from '../filters/http-exception.filter';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

/**
 * Controller for gender classification of names.
 */
@Controller()
@UseFilters(HttpExceptionFilter)
@ApiTags('classification')
export class ClassificationController {
  constructor(private readonly classificationService: ClassificationService) {}

  /**
   * Endpoint to classify a name by gender.
   *
   * @param query - The query parameters containing the name.
   * @returns An object containing the classification result.
   */
  @Get('classify')
  @ApiOperation({
    summary: 'Predict gender of a name',
    description:
      'Returns predicted gender, probability, and confidence metrics for a given name using Genderize.io API.',
  })
  @ApiQuery({
    name: 'name',
    required: true,
    description: 'The name to classify',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Successful prediction',
    schema: {
      example: {
        status: 'success',
        data: {
          name: 'john',
          gender: 'male',
          probability: 0.99,
          sample_size: 10000,
          is_confident: true,
          processed_at: '2026-04-17T05:25:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Missing name query parameter',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid name format or no prediction available',
  })
  @ApiResponse({
    status: 502,
    description: 'Genderize API returned non-OK status',
  })
  @ApiResponse({
    status: 504,
    description: 'Genderize API request timed out',
  })
  async classify(@Query() query: ClassificationQueryDto) {
    const result = await this.classificationService.getClassification(
      query.name,
    );
    return {
      status: 'success',
      data: result,
    };
  }
}
