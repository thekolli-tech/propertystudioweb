import type {
  NotificationChannelProviderKind,
  NotificationChannelProviderStatus,
} from '@property-studio/contracts';

export type NotificationSendResult = {
  status: NotificationChannelProviderStatus;
  providerMessageId: string | null;
  message: string;
};

export interface EmailProvider {
  readonly kind: 'EMAIL';
  status(): NotificationChannelProviderStatus;
  send(input: {
    to: string;
    subject: string;
    body: string;
  }): Promise<NotificationSendResult>;
}

export interface SmsProvider {
  readonly kind: 'SMS';
  status(): NotificationChannelProviderStatus;
  send(input: { to: string; body: string }): Promise<NotificationSendResult>;
}

export interface WhatsAppProvider {
  readonly kind: 'WHATSAPP';
  status(): NotificationChannelProviderStatus;
  send(input: { to: string; body: string }): Promise<NotificationSendResult>;
}

export class NullEmailProvider implements EmailProvider {
  readonly kind = 'EMAIL' as const;
  status(): NotificationChannelProviderStatus {
    return 'UNAVAILABLE';
  }
  async send(): Promise<NotificationSendResult> {
    return { status: 'UNAVAILABLE', providerMessageId: null, message: 'Email provider not configured.' };
  }
}

export class NullSmsProvider implements SmsProvider {
  readonly kind = 'SMS' as const;
  status(): NotificationChannelProviderStatus {
    return 'UNAVAILABLE';
  }
  async send(): Promise<NotificationSendResult> {
    return { status: 'UNAVAILABLE', providerMessageId: null, message: 'SMS provider not configured.' };
  }
}

export class NullWhatsAppProvider implements WhatsAppProvider {
  readonly kind = 'WHATSAPP' as const;
  status(): NotificationChannelProviderStatus {
    return 'UNAVAILABLE';
  }
  async send(): Promise<NotificationSendResult> {
    return {
      status: 'UNAVAILABLE',
      providerMessageId: null,
      message: 'WhatsApp provider not configured.',
    };
  }
}

export type ChannelNotificationProvider = EmailProvider | SmsProvider | WhatsAppProvider;

export function listNotificationProviderSummaries(providers: ChannelNotificationProvider[]) {
  return providers.map((provider) => ({
    kind: provider.kind as NotificationChannelProviderKind,
    status: provider.status(),
    message:
      provider.status() === 'UNAVAILABLE'
        ? `${provider.kind} provider not configured.`
        : `${provider.kind} provider ready.`,
  }));
}
