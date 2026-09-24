import 'reflect-metadata';
import { BaseEntity } from './base.entity';

class TestEntity extends BaseEntity {
  name: string;

  constructor(partial?: Partial<TestEntity>) {
    super(partial);
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

describe('BaseEntity', () => {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const updatedAt = new Date('2026-01-02T00:00:00.000Z');

  it('should instantiate and assign properties correctly', () => {
    const entity = new TestEntity({
      id: 'entity-123',
      name: 'Test Name',
      createdAt,
      updatedAt,
    });

    expect(entity.id).toBe('entity-123');
    expect(entity.name).toBe('Test Name');
    expect(entity.createdAt).toBe(createdAt);
    expect(entity.updatedAt).toBe(updatedAt);
  });

  it('should handle undefined partial gracefully', () => {
    const entity = new TestEntity();
    expect(entity.id).toBeUndefined();
    expect(entity.createdAt).toBeUndefined();
    expect(entity.updatedAt).toBeUndefined();
    expect(entity.name).toBeUndefined();
  });

  it('should serialize with toJSON and include id, createdAt, and updatedAt by default', () => {
    const entity = new TestEntity({
      id: 'entity-123',
      name: 'Test Name',
      createdAt,
      updatedAt,
    });

    const plain = entity.toJSON();
    expect(plain.id).toBe('entity-123');
    expect(plain.name).toBe('Test Name');
    expect(plain.createdAt).toEqual(createdAt);
    expect(plain.updatedAt).toEqual(updatedAt);
  });

  it('should work with JSON.stringify via toJSON', () => {
    const entity = new TestEntity({
      id: 'entity-123',
      name: 'Test Name',
      createdAt,
      updatedAt,
    });

    const json = JSON.parse(JSON.stringify(entity));
    expect(json.id).toBe('entity-123');
    expect(json.name).toBe('Test Name');
    expect(json.createdAt).toBe(createdAt.toISOString());
    expect(json.updatedAt).toBe(updatedAt.toISOString());
  });

  it('should transform createdAt and updatedAt from valid ISO strings into Date instances', () => {
    const entity = new TestEntity({
      id: 'entity-123',
      name: 'Test Name',
      createdAt: '2026-01-01T00:00:00.000Z' as unknown as Date,
      updatedAt: '2026-01-02T00:00:00.000Z' as unknown as Date,
    });

    expect(entity.createdAt).toBeInstanceOf(Date);
    expect(entity.createdAt?.toISOString()).toBe('2026-01-01T00:00:00.000Z');

    expect(entity.updatedAt).toBeInstanceOf(Date);
    expect(entity.updatedAt?.toISOString()).toBe('2026-01-02T00:00:00.000Z');
  });

  it('should transform createdAt and updatedAt from valid date strings into Date instances', () => {
    const entity = new TestEntity({
      createdAt: '2026-05-15' as unknown as Date,
      updatedAt: '2026-06-20' as unknown as Date,
    });

    expect(entity.createdAt).toBeInstanceOf(Date);
    expect(isNaN(entity.createdAt!.getTime())).toBe(false);

    expect(entity.updatedAt).toBeInstanceOf(Date);
    expect(isNaN(entity.updatedAt!.getTime())).toBe(false);
  });

  it('should make createdAt and updatedAt undefined when invalid date strings are provided', () => {
    const entity = new TestEntity({
      createdAt: 'invalid-date-string' as unknown as Date,
      updatedAt: 'not-a-valid-date' as unknown as Date,
    });

    expect(entity.createdAt).toBeUndefined();
    expect(entity.updatedAt).toBeUndefined();
  });
});
