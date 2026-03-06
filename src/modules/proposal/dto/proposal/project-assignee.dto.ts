import { Expose } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ProjectAssigneeDto {
  @Expose()
  @IsNotEmpty()
  @IsString()
  userId: string;

  @Expose()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @Expose()
  @IsNotEmpty()
  @IsString()
  email: string;
}
