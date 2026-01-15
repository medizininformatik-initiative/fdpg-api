import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { KeycloakService } from './keycloak.service';
import { KeycloakUtilService } from './keycloak-util.service';
import { EmailService } from '../email/email.service';
import { newUserRegistrationEmail } from '../email/user-registration.emails';
import { IGetKeycloakUser } from './types/keycloak-user.interface';

@Injectable()
export class UserRegistrationNotificationCron {
  private readonly logger = new Logger(UserRegistrationNotificationCron.name);

  constructor(
    private readonly keycloakService: KeycloakService,
    private readonly keycloakUtilService: KeycloakUtilService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Runs daily at 9:00 AM (Europe/Berlin timezone) to check for new user registrations in the last 24 hours
   * and sends an email notification to system administrators if there are any new registrations
   */
  @Cron('0 9 * * *', {
    name: 'UserRegistrationNotificationJob',
    timeZone: 'Europe/Berlin',
  })
  async checkNewRegistrations() {
    try {
      this.logger.log('Checking for new user registrations in the last 24 hours...');

      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);
      const dateFrom = oneDayAgo.toISOString();

      const registrationEvents = await this.keycloakService.getRegistrationEvents(dateFrom);

      if (!registrationEvents || registrationEvents.length === 0) {
        this.logger.log('No new user registrations found in the last 24 hours.');
        return;
      }

      this.logger.log(`Found ${registrationEvents.length} new registration(s).`);

      const userIds = [...new Set(registrationEvents.map((event) => event.userId))];

      const newUsers = await Promise.all(
        userIds.map(async (userId) => {
          try {
            return await this.keycloakService.getUserById(userId);
          } catch (error) {
            this.logger.warn(`Failed to fetch user details for user ID: ${userId}`, error);
            return null;
          }
        }),
      );

      const validNewUsers = newUsers.filter((user) => user !== null);

      if (validNewUsers.length === 0) {
        this.logger.warn('Could not retrieve details for any of the registered users.');
        return;
      }

      await this.sendRegistrationNotificationMails(validNewUsers);

      this.logger.log(`Successfully processed registration notifications for ${validNewUsers.length} new user(s).`);
    } catch (error) {
      this.logger.error('Failed to process user registration notifications:', error);
    }
  }

  private async sendRegistrationNotificationMails(validNewUsers: IGetKeycloakUser[]) {
    const emailTasks: Promise<void>[] = [];

    const adminTask = async () => {
      const adminMembers = await this.keycloakUtilService.getAdminMembers();
      const validAdminContacts = adminMembers
        .filter((member) => this.keycloakUtilService.filterForReceivingEmail(member))
        .map((member) => member.email)
        .filter((email) => email && email.length > 0);

      if (validAdminContacts.length === 0) {
        this.logger.warn('No admin member emails found to send notifications.');
        return Promise.resolve();
      }

      const mail = newUserRegistrationEmail(validAdminContacts, validNewUsers);

      return await this.emailService.send(mail);
    };

    emailTasks.push(adminTask());

    await Promise.allSettled(emailTasks);
  }
}
