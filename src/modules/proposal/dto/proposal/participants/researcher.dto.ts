import { Expose } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { ParticipantType } from 'src/modules/proposal/enums/participant-type.enum';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { ParticipantCategory } from 'src/modules/proposal/schema/sub-schema/participants/participant-category.schema';
import { Researcher } from 'src/modules/proposal/schema/sub-schema/participants/researcher.schema';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';

export class ResearcherDto extends WithIdForObjectDto {
  @Expose()
  @IsString()
  @MaxLength(100)
  @IsOptional()
  title: string;

  @Expose()
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  @MaxLength(250)
  firstName: string;

  @Expose()
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  @MaxLength(250)
  lastName: string;

  @Expose()
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  affiliation: string;

  @Expose()
  @IsEmail()
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  email: string;
}

export class ResearcherIdentityDto extends ResearcherDto {
  constructor(researcher: Researcher | ResearcherDto, category: ParticipantCategory) {
    super();
    this._id = researcher._id;
    this.firstName = researcher.firstName;
    this.lastName = researcher.lastName;
    this.affiliation = researcher.affiliation;
    this.email = researcher.email;
    this.participantType = category.category;
  }

  @Expose()
  username: string;

  @Expose()
  isExisting: boolean = false;

  @Expose()
  isEmailVerified: boolean = false;

  @Expose()
  isRegistrationComplete: boolean = false;

  @Expose()
  participantType: ParticipantType;
}
