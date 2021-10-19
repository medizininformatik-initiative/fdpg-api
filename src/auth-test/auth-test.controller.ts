import { Get, Request } from '@nestjs/common';
import { ApiController } from 'src/shared/decorators/api-controller.decorator';
import { Auth } from 'src/shared/decorators/auth.decorator';
import { Role } from 'src/shared/enums/role.enum';
import { AuthTestService } from './auth-test.service';
import { UserDto } from './dto/user.dto';

@ApiController('auth-test')
export class AuthTestController {
  constructor(private readonly authTestService: AuthTestService) {}

  @Auth()
  @Get()
  findAll(@Request() req): UserDto {
    return this.authTestService.findAll(req.user);
  }

  @Auth(Role.Admin)
  @Get('admin')
  adminGet(@Request() req): UserDto {
    return this.authTestService.findAll(req.user);
  }
}
