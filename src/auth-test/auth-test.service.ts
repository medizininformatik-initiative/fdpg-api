import { Injectable } from '@nestjs/common';
import { UserDto } from './dto/user.dto';

@Injectable()
export class AuthTestService {
  findAll(user: UserDto): UserDto {
    return user;
  }
}
