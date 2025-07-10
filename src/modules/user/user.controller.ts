import {
  Body,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  Inject,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ApiController } from 'src/shared/decorators/api-controller.decorator';
import { Auth } from 'src/shared/decorators/auth.decorator';
import { UuidParamDto } from 'src/shared/dto/uuid-id-param.dto';
import { Role } from 'src/shared/enums/role.enum';
import { CacheKey } from 'src/shared/enums/cache-key.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { UserValidation } from './decorators/validation.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { PasswordResetDto } from './dto/password-reset.dto';
import { ResendInvitationDto } from './dto/resend-invitation.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserEmailResponseDto } from './dto/user-response.dto';
import { EmailParamDto } from './dto/email-param.dto';
import { KeycloakService } from './keycloak.service';
import { KeycloakUtilService } from './keycloak-util.service';
import { IGetKeycloakUser } from './types/keycloak-user.interface';

@Auth(Role.FdpgMember, Role.DataSourceMember, Role.Admin)
@ApiController('users')
@UserValidation()
export class UserController {
  constructor(
    private readonly keycloakService: KeycloakService,
    private readonly keycloakUtilService: KeycloakUtilService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Creates a user with the follow steps in order: Register, Assign Role, Send Invitation' })
  @ApiConflictResponse({ description: 'Conflict while creating the user. Most likely because of existing username' })
  async create(@Body() user: CreateUserDto): Promise<string> {
    return await this.keycloakService.createUser(user);
  }

  @Get('emails')
  @Auth(Role.Admin, Role.FdpgMember)
  @ApiOperation({
    summary: 'Get email addresses of all valid users',
    description: 'Get email addresses. Use startsWith parameter to filter emails that start with specific characters.',
  })
  @ApiOkResponse({ description: 'List of email addresses', type: UserEmailResponseDto })
  async getUserEmails(@Query() query: UserQueryDto): Promise<UserEmailResponseDto> {
    let emails: string[] = [];

    let allUsers: IGetKeycloakUser[] = await this.cacheManager.get<IGetKeycloakUser[]>(CacheKey.AllUsers);

    if (!allUsers) {
      // cache for 1 hour
      allUsers = await this.keycloakService.getUsers();
      const oneHourInMs = 60 * 60 * 1000;
      await this.cacheManager.set(CacheKey.AllUsers, allUsers, oneHourInMs);
    }

    emails = allUsers
      .filter((user) => user.emailVerified && user.requiredActions.length === 0)
      .filter((user) => this.keycloakUtilService.filterForReceivingEmail(user))
      .filter((user) => user.attributes.MII_LOCATION)
      .map((user) => user.email)
      .filter((email) => {
        if (query.startsWith) {
          return email.toLowerCase().startsWith(query.startsWith.toLowerCase());
        }
        return true;
      });

    return {
      emails,
      total: emails.length,
    };
  }

  @Get('by-email/:email')
  @Auth(Role.Admin, Role.FdpgMember)
  @ApiOperation({ summary: 'Get user details by email address' })
  @ApiOkResponse({ description: 'User details' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async getUserByEmail(@Param() { email }: EmailParamDto): Promise<IGetKeycloakUser> {
    const users = await this.keycloakService.getUsers({ email, exact: true });

    if (users.length === 0) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return users[0];
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
