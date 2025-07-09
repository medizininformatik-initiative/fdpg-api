import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class UserEmailResponseDto {
  @Expose()
  emails: string[];

  @Expose()
  total: number;
}
