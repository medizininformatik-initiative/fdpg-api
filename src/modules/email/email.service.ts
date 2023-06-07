import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as SendGrid from '@sendgrid/mail';
import { EmailCategory } from './types/email-category.enum';
import { IEmail } from './types/email.interface';

@Injectable()
export class EmailService {
  constructor(private readonly configService: ConfigService) {
    SendGrid.setApiKey(this.configService.get<string>('SENDGRID_API_KEY'));

    this.senderInformation.email = this.configService.get<string>('SENDGRID_SENDER_MAIL');
    this.senderInformation.name = this.configService.get<string>('SENDGRID_SENDER_NAME');
    this.preventEmailSending =
      (this.configService.get<string>('EMAIL_SERVICE_PREVENT_ALL') ?? '').toLowerCase() === 'true';
    this.environment = this.configService.get<string>('ENV');
  }

  private senderInformation = {
    name: '',
    email: '',
  };

  private preventEmailSending: boolean;
  private environment: string;

  async send(email: IEmail): Promise<void> {
    if (this.preventEmailSending && this.environment === 'local') {
      console.log('Prevent sending emails to: ', email.to);
    }
    if (email.to.length <= 0 || this.preventEmailSending) {
      return;
    }

    const baseCategories: (EmailCategory | `ENV:${string}`)[] = [EmailCategory._Api, `ENV:${this.environment}`];
    // Receivers won't see each other if isMultiple
    const isMultiple = email.to.length > 1;

    email.categories = [...email.categories, ...baseCategories];

    const sendGridMail: SendGrid.MailDataRequired = {
      ...email,
      from: this.senderInformation,
    };
    try {
      await SendGrid.send(sendGridMail, isMultiple);
    } catch (error) {
      console.log('Failed sending email');
      console.log(error);

      console.log(JSON.stringify(error));
    }
  }
}
