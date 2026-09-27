import { Reflector } from '@nestjs/core';
import {
  BypassResponseTransform,
  BYPASS_RESPONSE_TRANSFORM_METADATA,
} from './bypass-response-transform.decorator';

class TestController {
  @BypassResponseTransform()
  rawMethod() {
    return 'raw';
  }
}

describe('BypassResponseTransform Decorator', () => {
  it('should set metadata for bypass transform', () => {
    const reflector = new Reflector();
    const descriptor = Object.getOwnPropertyDescriptor(
      TestController.prototype,
      'rawMethod',
    );
    const target = descriptor?.value as (...args: unknown[]) => unknown;
    const isBypassed = reflector.get<boolean>(
      BYPASS_RESPONSE_TRANSFORM_METADATA,
      target,
    );

    expect(isBypassed).toBe(true);
  });
});
