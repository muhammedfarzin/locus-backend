import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { OtpRepository } from './otp.repository';
import { Otp, OtpDocument } from '../schemas/otp.schema';
import { OtpEntity } from '../entities/otp.entity';
import { OtpType } from '../enums/otp-type.enum';

describe('OtpRepository', () => {
  let repository: OtpRepository;

  const createdAt = new Date();
  const updatedAt = new Date();
  const expiresAt = new Date(Date.now() + 600000);

  const mockOtpDoc = {
    _id: 'mock-otp-id',
    id: 'mock-otp-id',
    identifier: 'test@example.com',
    type: OtpType.EMAIL_VERIFICATION,
    codeHash: 'hashed-code',
    attempts: 0,
    resendCount: 1,
    expiresAt,
    toObject: () => ({
      createdAt,
      updatedAt,
    }),
  } as unknown as OtpDocument;

  class MockOtpModel {
    static findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockOtpDoc),
    });

    static findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockOtpDoc),
    });

    static findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...mockOtpDoc,
        attempts: 1,
        toObject: () => ({ createdAt, updatedAt }),
      }),
    });

    static deleteOne = jest.fn().mockReturnValue({
      exec: jest
        .fn()
        .mockResolvedValue({ acknowledged: true, deletedCount: 1 }),
    });
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpRepository,
        {
          provide: getModelToken(Otp.name),
          useValue: MockOtpModel,
        },
      ],
    }).compile();

    repository = module.get<OtpRepository>(OtpRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create or update OTP document and return OtpEntity', async () => {
    const result = await repository.createOrUpdate(
      'Test@Example.com',
      OtpType.EMAIL_VERIFICATION,
      {
        codeHash: 'hashed-code',
        expiresAt,
        attempts: 0,
        resendCount: 1,
      },
    );

    expect(MockOtpModel.findOneAndUpdate).toHaveBeenCalledWith(
      { identifier: 'test@example.com', type: OtpType.EMAIL_VERIFICATION },
      {
        identifier: 'test@example.com',
        type: OtpType.EMAIL_VERIFICATION,
        codeHash: 'hashed-code',
        attempts: 0,
        resendCount: 1,
        expiresAt,
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
    expect(result).toBeInstanceOf(OtpEntity);
    expect(result.id).toBe('mock-otp-id');
    expect(result.identifier).toBe('test@example.com');
    expect(result.resendCount).toBe(1);
    expect(result.createdAt).toEqual(createdAt);
    expect(result.updatedAt).toEqual(updatedAt);
  });

  it('should find OTP by identifier and type and return OtpEntity', async () => {
    const result = await repository.findByIdentifierAndType(
      'Test@Example.com',
      OtpType.EMAIL_VERIFICATION,
    );

    expect(MockOtpModel.findOne).toHaveBeenCalledWith({
      identifier: 'test@example.com',
      type: OtpType.EMAIL_VERIFICATION,
    });
    expect(result).toBeInstanceOf(OtpEntity);
    expect(result?.id).toBe('mock-otp-id');
  });

  it('should increment attempts by ID and return updated OtpEntity', async () => {
    const result = await repository.incrementAttempts('mock-otp-id');

    expect(MockOtpModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'mock-otp-id',
      { $inc: { attempts: 1 } },
      { returnDocument: 'after' },
    );
    expect(result).toBeInstanceOf(OtpEntity);
    expect(result?.attempts).toBe(1);
  });

  it('should delete OTP by identifier and type', async () => {
    await repository.deleteByIdentifierAndType(
      'Test@Example.com',
      OtpType.EMAIL_VERIFICATION,
    );

    expect(MockOtpModel.deleteOne).toHaveBeenCalledWith({
      identifier: 'test@example.com',
      type: OtpType.EMAIL_VERIFICATION,
    });
  });
});
