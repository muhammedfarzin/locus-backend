import { Reflector } from '@nestjs/core';
import {
  ResponseMessage,
  RESPONSE_MESSAGE_METADATA,
} from './response-message.decorator';

class TestController {
  @ResponseMessage('Custom success message')
  testMethod() {
    return 'ok';
  }
}

describe('ResponseMessage Decorator', () => {
  it('should set metadata for response message', () => {
    const reflector = new Reflector();
    const descriptor = Object.getOwnPropertyDescriptor(
      TestController.prototype,
      'testMethod',
    );
    const target = descriptor?.value as (...args: unknown[]) => unknown;
    const message = reflector.get<string>(RESPONSE_MESSAGE_METADATA, target);

    expect(message).toBe('Custom success message');
  });
});
