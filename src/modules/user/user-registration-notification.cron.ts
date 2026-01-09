// src/tasks/event-monitor.task.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { KeycloakService } from '../user/keycloak.service';

@Injectable()
export class UserRegistrationNotificationCron {
  private readonly logger = new Logger(UserRegistrationNotificationCron.name);

  constructor(private readonly keycloakService: KeycloakService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkNewRegistrations() {
    this.logger.log('Checking for new user registrations...');
    const events = await this.keycloakService.getRegistrationEvents('2025-01-01T00:00:00Z');
    this.logger.log(`Fetched registration events.`);
  }
}
