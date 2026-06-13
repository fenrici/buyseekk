import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resendClient: Resend | null = null;

  constructor(private config: ConfigService) {}

  private getResendClient(): Resend {
    if (!this.resendClient) {
      const apiKey = this.config.get<string>('EMAIL_API_KEY');
      if (!apiKey) {
        throw new Error('EMAIL_API_KEY no configurada');
      }
      this.resendClient = new Resend(apiKey);
    }
    return this.resendClient;
  }

  private isResendSandbox(from: string) {
    return from.includes('@resend.dev');
  }

  /** Sin dominio verificado, Resend solo entrega al email de la cuenta. */
  private applySandboxRedirect(payload: EmailPayload, from: string): EmailPayload {
    const sandboxTo = this.config.get<string>('EMAIL_SANDBOX_TO')?.trim();
    if (!sandboxTo || !this.isResendSandbox(from) || payload.to === sandboxTo) {
      return payload;
    }

    this.logger.warn(
      `[email:resend:sandbox] redirigiendo ${payload.to} → ${sandboxTo} (sin dominio propio)`,
    );

    return {
      to: sandboxTo,
      subject: `[Buyseek → ${payload.to}] ${payload.subject}`,
      text: `(Modo sandbox — email destinado a ${payload.to})\n\n${payload.text}`,
      html: `<p><em>Modo sandbox — email destinado a <strong>${payload.to}</strong></em></p>${payload.html}`,
    };
  }

  async send(payload: EmailPayload): Promise<void> {
    const provider = this.config.get<string>('EMAIL_PROVIDER', 'console');
    const from = this.config.get<string>('EMAIL_FROM', 'noreply@buyseekk.com');

    if (provider === 'console') {
      this.logger.log(
        `[email:console] to=${payload.to} subject="${payload.subject}"\n${payload.text}`,
      );
      return;
    }

    if (provider === 'resend') {
      const outbound = this.applySandboxRedirect(payload, from);
      const { data, error } = await this.getResendClient().emails.send({
        from,
        to: [outbound.to],
        subject: outbound.subject,
        html: outbound.html,
        text: outbound.text,
      });
      if (error) {
        this.logger.error(`Resend error: ${error.message}`);
        throw new Error('No se pudo enviar el email');
      }
      this.logger.log(
        `[email:resend] sent id=${data?.id ?? 'unknown'} to=${outbound.to}` +
          (outbound.to !== payload.to ? ` (original: ${payload.to})` : ''),
      );
      return;
    }

    this.logger.warn(`EMAIL_PROVIDER desconocido: ${provider}`);
  }

  buildVerificationEmail(verifyUrl: string, locale: 'ES' | 'EN') {
    if (locale === 'EN') {
      return {
        subject: 'Verify your Buyseek account',
        text: `Welcome to Buyseek. Verify your email by opening this link (valid 24 hours):\n\n${verifyUrl}`,
        html: `<p>Welcome to Buyseek.</p><p><a href="${verifyUrl}">Verify your email</a></p><p>This link expires in 24 hours.</p>`,
      };
    }
    return {
      subject: 'Verificá tu cuenta de Buyseek',
      text: `Bienvenido a Buyseek. Verificá tu email abriendo este enlace (válido 24 horas):\n\n${verifyUrl}`,
      html: `<p>Bienvenido a Buyseek.</p><p><a href="${verifyUrl}">Verificá tu email</a></p><p>Este enlace vence en 24 horas.</p>`,
    };
  }

  buildPasswordResetEmail(resetUrl: string, locale: 'ES' | 'EN') {
    if (locale === 'EN') {
      return {
        subject: 'Reset your Buyseek password',
        text: `We received a password reset request. Open this link (valid 1 hour):\n\n${resetUrl}`,
        html: `<p>We received a password reset request.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 1 hour.</p>`,
      };
    }
    return {
      subject: 'Restablecé tu contraseña de Buyseek',
      text: `Recibimos una solicitud para restablecer tu contraseña. Abrí este enlace (válido 1 hora):\n\n${resetUrl}`,
      html: `<p>Recibimos una solicitud para restablecer tu contraseña.</p><p><a href="${resetUrl}">Restablecer contraseña</a></p><p>Este enlace vence en 1 hora.</p>`,
    };
  }
}
