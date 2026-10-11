import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.getOrThrow<string>('MAIL_USER'),
        pass: this.configService.getOrThrow<string>('MAIL_APP_PASSWORD'), // Gmail app password, not the account password
      },
    });
  }

  async sendMagicLink(email: string, token: string): Promise<boolean> {
    const frontendUrl =   this.configService.get<string>('FRONTEND_URL');
    const magicLinkUrl = `${frontendUrl}/auth/verify?token=${token}`;
    try {
      await this.transporter.sendMail({
        to: email,
        subject: 'Your Magic Link for Login',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Our App</h2>
            <p>Click the button below to log in:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicLinkUrl}" 
                 style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Log In
              </a>
            </div>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p>${magicLinkUrl}</p>
            <p>This link will expire in 15 minutes.</p>
          </div>
      `,
      });
      this.logger.log(`Magic link email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error('Error sending email', error);
      return false;
    }
  }
}
