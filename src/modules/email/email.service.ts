import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as SendInBlue from '@sendinblue/client';
import { EmailCategory } from './types/email-category.enum';
import { IEmail, ITemplateEmail } from './types/email.interface';
@Injectable()
export class EmailService {
  private apiInstance: SendInBlue.TransactionalEmailsApi;
  constructor(private readonly configService: ConfigService) {
    this.apiInstance = new SendInBlue.TransactionalEmailsApi();

    const apiKey = this.configService.get<string>('SENDINBLUE_API_KEY');
    this.apiInstance.setApiKey(SendInBlue.TransactionalEmailsApiApiKeys.apiKey, apiKey);
    this.senderInformation.email = this.configService.get<string>('SENDINBLUE_SENDER_MAIL');
    this.senderInformation.name = this.configService.get<string>('SENDINBLUE_SENDER_NAME');
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

  async send(email: IEmail | ITemplateEmail): Promise<void> {
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

    const transactionalEmail = new SendInBlue.SendSmtpEmail();
    if (isMultiple) {
      transactionalEmail.messageVersions = email.to.map((email) => ({
        to: [{ email }],
      }));
    } else {
      transactionalEmail.to = email.to.map((email) => ({ email }));
    }
    transactionalEmail.sender = this.senderInformation;
    transactionalEmail.tags = email.categories;
    transactionalEmail.subject = email.subject;
    if ('html' in email) {
      transactionalEmail.htmlContent = email.html;
    }
    if ('text' in email) {
      transactionalEmail.textContent = email.text;
    }
    if ('templateId' in email) {
      transactionalEmail.templateId = email.templateId;
      transactionalEmail.params = email.params;
    }
    try {
      await this.apiInstance.sendTransacEmail(transactionalEmail);
    } catch (error) {
      console.log('Failed sending email');
      console.log(error);

      console.log(JSON.stringify(error));
    }
  }
}
