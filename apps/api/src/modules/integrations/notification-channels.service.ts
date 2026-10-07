import { Injectable } from '@nestjs/common';

import {
  listNotificationProviderSummaries,
  NullEmailProvider,
  NullSmsProvider,
  NullWhatsAppProvider,
  type ChannelNotificationProvider,
  type EmailProvider,
  type SmsProvider,
  type WhatsAppProvider,
} from './providers/notification.providers';

@Injectable()
export class NotificationChannelsService {
  readonly email: EmailProvider = new NullEmailProvider();
  readonly sms: SmsProvider = new NullSmsProvider();
  readonly whatsapp: WhatsAppProvider = new NullWhatsAppProvider();

  all(): ChannelNotificationProvider[] {
    return [this.email, this.sms, this.whatsapp];
  }

  list() {
    return { providers: listNotificationProviderSummaries(this.all()) };
  }

  async sendEmail(input: { to: string; subject: string; body: string }) {
    return this.email.send(input);
  }

  async sendSms(input: { to: string; body: string }) {
    return this.sms.send(input);
  }

  async sendWhatsApp(input: { to: string; body: string }) {
    return this.whatsapp.send(input);
  }
}
