import { Type, instanceToPlain, plainToInstance } from 'class-transformer';

export abstract class BaseEntity {
  id: string;

  @Type(() => Date)
  createdAt?: Date;

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
          }) as Record<string, any>;
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
