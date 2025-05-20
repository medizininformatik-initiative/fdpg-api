import { Body, HttpCode, Param, Patch, Post, Put, Request } from '@nestjs/common';
import { ApiConflictResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOperation } from '@nestjs/swagger';
import { ApiController } from 'src/shared/decorators/api-controller.decorator';
import { Auth } from 'src/shared/decorators/auth.decorator';
import { UuidParamDto } from 'src/shared/dto/uuid-id-param.dto';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { UserValidation } from './decorators/validation.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { PasswordResetDto } from './dto/password-reset.dto';
import { ResendInvitationDto } from './dto/resend-invitation.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { KeycloakService } from './keycloak.service';

@Auth(Role.FdpgMember, Role.DataSourceMember, Role.Admin)
@ApiController('users')
@UserValidation()
export class UserController {
  constructor(private readonly keycloakService: KeycloakService) {}

  @Post()
  @ApiOperation({ summary: 'Creates a user with the follow steps in order: Register, Assign Role, Send Invitation' })
  @ApiConflictResponse({ description: 'Conflict while creating the user. Most likely because of existing username' })
  async create(@Body() user: CreateUserDto): Promise<string> {
    return await this.keycloakService.createUser(user);
  }

  @Auth(Role.FdpgMember, Role.DataSourceMember, Role.Admin, Role.Researcher, Role.DizMember, Role.UacMember)
  @Put(':id')
  @ApiOperation({ summary: 'Updates the user profile' })
  @ApiNotFoundResponse({ description: 'Item could not be found' })
  @ApiNoContentResponse({ description: 'User profile successfully updated' })
  @HttpCode(204)
  async updateProfile(
    @Param() { id }: UuidParamDto,
    @Body() updateUserDto: UpdateUserDto,
    @Request() { user }: FdpgRequest,
  ): Promise<void> {
    return await this.keycloakService.updateProfile(id, updateUserDto, user);
  }

  @Patch('resend-invitation')
  @ApiOperation({ summary: 'Resend invitation to complete the registration of the user' })
  @ApiNotFoundResponse({ description: 'Users with provided email are not registered' })
  @ApiNoContentResponse({ description: 'Invitation successfully resent. No content returns.' })
  @HttpCode(204)
  async resendInvitation(@Body() resendInvitationDto: ResendInvitationDto): Promise<void> {
    return await this.keycloakService.resendInvitation(resendInvitationDto);
  }

  @Auth(Role.FdpgMember, Role.DataSourceMember, Role.Admin, Role.Researcher, Role.DizMember, Role.UacMember)
  @Put(':id/password-reset')
  @ApiOperation({ summary: 'Sends a password change notification via email to the user' })
  @ApiNotFoundResponse({ description: 'Item could not be found' })
  @ApiNoContentResponse({ description: 'Notification successfully sent. No content returns.' })
  @HttpCode(204)
  async passwordChange(
    @Param() { id }: UuidParamDto,
    @Body() passwordResetDto: PasswordResetDto,
    @Request() { user }: FdpgRequest,
  ): Promise<void> {
    return await this.keycloakService.executeActionsEmailForPassword(id, passwordResetDto, user);
  }
}
