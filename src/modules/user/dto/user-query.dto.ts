import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { Role } from 'src/shared/enums/role.enum';

export class UserQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'startsWith must be at least 3 character' })
  startsWith?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }
    return value; // Return as-is if not a string
  })
  @IsArray()
  @IsEnum(Role, { each: true })
  @IsOptional()
  roles?: Role[];

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }
    return value; // Return as-is if not a string
  })
  @IsArray()
  @IsEnum(PlatformIdentifier, { each: true })
  @IsOptional()
  dataSources?: PlatformIdentifier[];
}
