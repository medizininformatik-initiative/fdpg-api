import { Exclude, Expose } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';
import { Salutation } from '../enums/salutation.enum';
import { IGetKeycloakUser, IUpdateKeycloakProfile } from '../types/keycloak-user.interface';

@Exclude()
export class UpdateUserDto {
  @Expose()
  @IsEnum(Salutation)
  salutation: Salutation;

  @Expose()
  @IsOptional()
  title?: string;

  @Expose()
  @IsNotEmptyString()
  firstName: string;

  @Expose()
  @IsNotEmptyString()
  lastName: string;

  @Expose()
  @IsNotEmptyString()
  affiliation: string;

  @Expose()
  @IsBoolean()
  receiveProposalEmails: boolean;

  @Exclude()
  getMergedUser(keycloakUser: IGetKeycloakUser): IUpdateKeycloakProfile {
    const mergedUser = {
      firstName: this.firstName,
      lastName: this.lastName,
      attributes: {
        ...keycloakUser.attributes,
        salutation: [this.salutation],
        affiliation: [this.affiliation],
        receiveProposalEmails: [this.receiveProposalEmails],
      },
    };

    if (this.title) {
      mergedUser.attributes.title = [this.title];
    }

    return mergedUser;
  }
}
