export const MAIL_SERVICE = Symbol('MAIL_SERVICE');

export interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface IMailService {
  sendMail(options: SendMailOptions): Promise<void>;
  sendOtpEmail(
    email: string,
    otp: string,
    options?: { expirationMinutes?: number },
  ): Promise<void>;
}
