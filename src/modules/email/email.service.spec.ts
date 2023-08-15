import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import * as SendInBlue from '@sendinblue/client';
import { EmailCategory } from './types/email-category.enum';
import { NoErrorThrownError, getError } from 'test/get-error';

jest.mock('@sendinblue/client', () => {
  const TransactionalEmailsApi = jest.fn();
  TransactionalEmailsApi.prototype.setApiKey = jest.fn();
  TransactionalEmailsApi.prototype.sendTransacEmail = jest.fn();
  const SendSmtpEmail = jest.fn();
  const TransactionalEmailsApiApiKeys = { apiKey: 'api-key' };
  return { TransactionalEmailsApi, SendSmtpEmail, TransactionalEmailsApiApiKeys };
});

describe('EmailService', () => {
  let emailService: EmailService;
  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => key),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
      imports: [],
    }).compile();

    emailService = module.get<EmailService>(EmailService);
  });

  describe('constructor', () => {
    it('should get config values', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('SENDINBLUE_API_KEY');
      expect(mockConfigService.get).toHaveBeenCalledWith('SENDINBLUE_SENDER_MAIL');
      expect(mockConfigService.get).toHaveBeenCalledWith('SENDINBLUE_SENDER_NAME');
      expect(mockConfigService.get).toHaveBeenCalledWith('EMAIL_SERVICE_PREVENT_ALL');
    });

    it('should set the api key', () => {
      expect(emailService).toBeDefined();
      expect(new SendInBlue.TransactionalEmailsApi().setApiKey).toHaveBeenCalledWith('api-key', 'SENDINBLUE_API_KEY');
    });
  });

  describe('send', () => {
    it('should not send email if preventEmailSending is true', async () => {
      emailService['preventEmailSending'] = true;

      const email = {
        to: ['unit@test.de'],
      } as any;

      await emailService.send(email);

      expect(new SendInBlue.TransactionalEmailsApi().sendTransacEmail).not.toHaveBeenCalled();
    });

    it('should not send email if email.to is empty', async () => {
      emailService['preventEmailSending'] = false;

      const email = {
        to: [],
      } as any;

      await emailService.send(email);

      expect(new SendInBlue.TransactionalEmailsApi().sendTransacEmail).not.toHaveBeenCalled();
    });

    it('should send email if preventEmailSending is false and email.to is not empty', async () => {
      emailService['preventEmailSending'] = false;

      const email = {
        to: ['unit@test.de'],
        categories: [EmailCategory.CommentTask],
      } as any;

      await emailService.send(email);

      expect(new SendInBlue.TransactionalEmailsApi().sendTransacEmail).toHaveBeenCalledWith({
        sender: {
          email: 'SENDINBLUE_SENDER_MAIL',
          name: 'SENDINBLUE_SENDER_NAME',
        },
        subject: undefined,
        tags: ['COMMENT_TASK', 'API', 'ENV:ENV'],
        to: [{ email: 'unit@test.de' }],
      });
    });

    it('should log error if sendInBlue.send throws an error', async () => {
      emailService['preventEmailSending'] = false;
      jest.spyOn(console, 'log');
      jest.spyOn(new SendInBlue.TransactionalEmailsApi(), 'sendTransacEmail').mockRejectedValueOnce('error');

      const email = {
        to: ['test@unit.de'],
        categories: [EmailCategory.CommentTask],
      } as any;

      const serviceCall = await emailService.send(email);

      const error = await getError(async () => await serviceCall);

      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(NoErrorThrownError);

      expect(console.log).toHaveBeenCalledWith('Failed sending email');
    });
  });
});
