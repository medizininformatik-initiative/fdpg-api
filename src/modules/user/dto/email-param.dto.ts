import { IsEmail } from 'class-validator';

export class EmailParamDto {
  @IsEmail()
  email: string;
}
