import { IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class UserQueryDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeInvalidEmails?: boolean;
}
