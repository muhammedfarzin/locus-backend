import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MAIL_SERVICE } from './mail.service.interface';

@Module({
  providers: [
    MailService,
    {
      provide: MAIL_SERVICE,
      useExisting: MailService,
    },
  ],
  exports: [MailService, MAIL_SERVICE],
})
export class MailModule {}
