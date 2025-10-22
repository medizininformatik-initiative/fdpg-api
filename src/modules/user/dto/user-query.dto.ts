import { IsOptional, IsString, MinLength } from 'class-validator';

export class UserQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'startsWith must be at least 3 character' })
  startsWith?: string;
}
