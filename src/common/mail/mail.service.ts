import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { IMailService, SendMailOptions } from './mail.service.interface';

@Injectable()
export class MailService implements IMailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private readonly defaultFrom: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.defaultFrom =
      this.configService.get<string>('MAIL_FROM') || 'no-reply@locus.com';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
      this.logger.log(`SMTP Mail transport initialized for ${host}:${port}`);
    } else {
      this.logger.log(
        'SMTP credentials not fully configured. MailService running in console/mock mode.',
      );
    }
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.defaultFrom,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });
        this.logger.log(
          `Email sent successfully to ${options.to} with subject "${options.subject}"`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send email to ${options.to}: ${(error as Error).message}`,
          (error as Error).stack,
        );
        throw error;
      }
    } else {
      this.logger.log(
        `[MOCK EMAIL] To: ${options.to} | Subject: "${options.subject}"\n` +
          `Text: ${options.text ?? ''}\n` +
          `HTML: ${options.html ?? ''}`,
      );
    }
  }

  async sendOtpEmail(
    email: string,
    otp: string,
    options?: { expirationMinutes?: number },
  ): Promise<void> {
    const minutes = options?.expirationMinutes ?? 10;
    const subject = 'Your Locus Email Verification Code';
    const text = `Your verification code is ${otp}. It will expire in ${minutes} minutes. If you did not request this, please ignore this email.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #333; text-align: center;">Verify Your Email</h2>
        <p style="font-size: 16px; color: #555;">Thank you for registering with Locus. Please use the following One-Time Password (OTP) to complete your email verification:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2563eb; background-color: #eff6ff; padding: 12px 24px; border-radius: 6px; display: inline-block;">
            ${otp}
          </span>
        </div>
        <p style="font-size: 14px; color: #777;">This code is valid for <strong>${minutes} minutes</strong>. If you did not sign up for a Locus account, please disregard this email.</p>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">&copy; ${new Date().getFullYear()} Locus Platform. All rights reserved.</p>
      </div>
    `;

    await this.sendMail({
      to: email,
      subject,
      text,
      html,
    });
  }
}
