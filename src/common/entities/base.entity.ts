import { Type, instanceToPlain, plainToInstance } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export abstract class BaseEntity {
  @ApiProperty({
    description: 'Unique identifier',
    example: '60d0fe4f5311236168a109ca',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'Timestamp when the entity was created',
    example: '2026-09-25T00:00:00.000Z',
    type: Date,
  })
  @Type(() => Date)
  createdAt?: Date;

  @ApiPropertyOptional({
    description: 'Timestamp when the entity was last updated',
    example: '2026-09-25T00:00:00.000Z',
    type: Date,
  })
  @Type(() => Date)
  updatedAt?: Date;

  constructor(partial?: Partial<BaseEntity> | Record<string, unknown>) {
    if (partial) {
      const dateFields = ['createdAt', 'updatedAt'] as const;
      for (const field of dateFields) {
        const value = partial[field];
        let date: Date | undefined;

        if (value instanceof Date) {
          date = value;
        } else if (typeof value === 'string') {
          const transformed = plainToInstance(BaseEntity as any, {
            [field]: value,
          }) as unknown as Record<string, Date | undefined>;
          date = transformed[field];
        }

        if (date instanceof Date && !isNaN(date.getTime())) {
          if (!Object.isFrozen(partial)) {
            partial[field] = date;
          }
        } else {
          if (!Object.isFrozen(partial) && field in partial) {
            delete partial[field];
          }
        }
      }

      Object.assign(this, partial);
    }
  }

  toJSON(): Record<string, unknown> {
    return instanceToPlain(this);
  }
}
