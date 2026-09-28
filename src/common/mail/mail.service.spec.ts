import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('MailService', () => {
  let service: MailService;
  let configService: ConfigService;
  let mockSendMail: jest.Mock;

  beforeEach(async () => {
    mockSendMail = jest.fn().mockResolvedValue({ messageId: 'mock-id' });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'SMTP_HOST') return 'smtp.example.com';
              if (key === 'SMTP_PORT') return 587;
              if (key === 'SMTP_USER') return 'user@example.com';
              if (key === 'SMTP_PASS') return 'secret';
              if (key === 'MAIL_FROM') return 'no-reply@locus.com';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize transporter when SMTP config is provided', () => {
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: {
        user: 'user@example.com',
        pass: 'secret',
      },
    });
  });

  it('should send email using transporter when configured', async () => {
    await service.sendMail({
      to: 'recipient@example.com',
      subject: 'Test Subject',
      text: 'Test Body',
    });

    expect(mockSendMail).toHaveBeenCalledWith({
      from: 'no-reply@locus.com',
      to: 'recipient@example.com',
      subject: 'Test Subject',
      text: 'Test Body',
      html: undefined,
    });
  });

  it('should rethrow error and log when transporter.sendMail fails', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP connection error'));
    const loggerErrorSpy = jest
      .spyOn((service as any).logger, 'error')
      .mockImplementation(() => {});

    await expect(
      service.sendMail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
      }),
    ).rejects.toThrow('SMTP connection error');

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to send email to recipient@example.com'),
      expect.any(String),
    );
  });

  it('should format and send OTP email', async () => {
    const sendMailSpy = jest.spyOn(service, 'sendMail').mockResolvedValue();

    await service.sendOtpEmail('john@example.com', '123456', {
      expirationMinutes: 15,
    });

    expect(sendMailSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'john@example.com',
        subject: 'Your Locus Email Verification Code',
        text: expect.stringContaining('123456'),
        html: expect.stringContaining('123456'),
      }),
    );
  });

  it('should handle unconfigured SMTP gracefully in mock mode', async () => {
    const mockModule: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
      ],
    }).compile();

    const mockService = mockModule.get<MailService>(MailService);
    await expect(
      mockService.sendMail({
        to: 'user@test.com',
        subject: 'Mock Subject',
        text: 'Hello',
      }),
    ).resolves.not.toThrow();
  });
});
