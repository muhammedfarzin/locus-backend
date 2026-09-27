import { Controller, Get, HttpStatus } from '@nestjs/common';
import {
  ApiStandardResponse,
  ApiStandardErrorResponse,
} from './api-standard-response.decorator';

class SampleDto {
  name: string;
}

@Controller('sample')
class SampleController {
  @Get('item')
  @ApiStandardResponse({
    type: SampleDto,
    status: HttpStatus.OK,
    description: 'Item retrieved',
  })
  getItem() {
    return { name: 'Sample' };
  }

  @Get('items')
  @ApiStandardResponse({
    type: [SampleDto],
    status: HttpStatus.OK,
    description: 'Items retrieved',
  })
  getItems() {
    return [{ name: 'Sample' }];
  }

  @Get('void')
  @ApiStandardResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'No content',
  })
  getVoid() {
    return null;
  }

  @Get('error')
  @ApiStandardErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request error',
    exampleMessage: 'Invalid ID',
    exampleError: 'Bad Request',
  })
  getError() {
    return null;
  }

  @Get('array-error')
  @ApiStandardErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
    exampleMessage: ['Error 1', 'Error 2'],
  })
  getArrayError() {
    return null;
  }
  @Get('custom-path')
  @ApiStandardResponse({
    status: HttpStatus.OK,
    description: 'Custom path success',
    path: '/custom/success/path',
  })
  getCustomPath() {
    return null;
  }

  @Get('custom-error-path')
  @ApiStandardErrorResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Custom path error',
    path: '/custom/error/path',
  })
  getCustomErrorPath() {
    return null;
  }
}

describe('ApiStandardResponse and ApiStandardErrorResponse decorators', () => {
  it('should apply decorator without error', () => {
    expect(SampleController).toBeDefined();
    expect(
      Reflect.getMetadataKeys(SampleController.prototype, 'getItem'),
    ).toBeDefined();
    expect(
      Reflect.getMetadataKeys(SampleController.prototype, 'getItems'),
    ).toBeDefined();
    expect(
      Reflect.getMetadataKeys(SampleController.prototype, 'getVoid'),
    ).toBeDefined();
    expect(
      Reflect.getMetadataKeys(SampleController.prototype, 'getError'),
    ).toBeDefined();
    expect(
      Reflect.getMetadataKeys(SampleController.prototype, 'getArrayError'),
    ).toBeDefined();
  });

  it('should set custom path example when path option is provided', () => {
    const successResponses = Reflect.getMetadata(
      'swagger/apiResponse',
      SampleController.prototype.getCustomPath,
    );
    expect(successResponses).toBeDefined();
    const successSchemaProps =
      successResponses['200']?.schema?.allOf?.[1]?.properties;
    expect(successSchemaProps?.path).toEqual({
      type: 'string',
      example: '/custom/success/path',
    });

    const errorResponses = Reflect.getMetadata(
      'swagger/apiResponse',
      SampleController.prototype.getCustomErrorPath,
    );
    expect(errorResponses).toBeDefined();
    const errorSchemaProps =
      errorResponses['403']?.schema?.allOf?.[1]?.properties;
    expect(errorSchemaProps?.path).toEqual({
      type: 'string',
      example: '/custom/error/path',
    });
  });
});
