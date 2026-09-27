import { SetMetadata } from '@nestjs/common';

export const BYPASS_RESPONSE_TRANSFORM_METADATA =
  'BYPASS_RESPONSE_TRANSFORM_METADATA';

/**
 * Decorator to bypass the standard response interceptor transformation.
 * Useful for webhooks, file downloads, streaming endpoints, etc.
 */
export const BypassResponseTransform = () =>
  SetMetadata(BYPASS_RESPONSE_TRANSFORM_METADATA, true);
