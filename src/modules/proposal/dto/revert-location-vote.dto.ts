import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class RevertLocationVoteDto {
  @Expose()
  location: string;
}
