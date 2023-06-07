import { IsNotEmpty, IsString } from 'class-validator';

export class CheckUniqueProposalDto {
  @IsString()
  @IsNotEmpty()
  projectAbbreviation: string;
}
