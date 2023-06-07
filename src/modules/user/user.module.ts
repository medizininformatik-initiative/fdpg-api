import { CacheModule, Module } from '@nestjs/common';
import { KeycloakUtilService } from './keycloak-util.service';
import { KeycloakClient } from './keycloak.client';
import { KeycloakService } from './keycloak.service';
import { UserController } from './user.controller';

@Module({
  imports: [CacheModule.register()],
  providers: [KeycloakClient, KeycloakService, KeycloakUtilService],
  exports: [KeycloakService, KeycloakUtilService],
  controllers: [UserController],
})
export class UserModule {}
