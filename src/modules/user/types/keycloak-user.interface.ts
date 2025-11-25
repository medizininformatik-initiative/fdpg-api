import { CountryCode } from 'src/shared/enums/country-code.enum';
import { Role } from 'src/shared/enums/role.enum';
import { KeycloakLocale } from '../enums/keycloak-locale.enum';
import { KeycloakRequiredAction } from '../enums/keycloak-required-action.enum';
import { Salutation } from '../enums/salutation.enum';

export interface IBaseKeycloakUser {
  username: string;
  enabled: boolean;
  emailVerified?: boolean;
  firstName: string;
  lastName: string;
  email: string;
  attributes?: {
    locale?: KeycloakLocale[];
    MII_LOCATION?: string[];
    terms_and_conditions?: string[];
    affiliation?: string[];
    assignedDataSources?: any;
    salutation?: Salutation[];
    userVerificationHint?: string[];
    title?: string[];
    desiredRole?: Role[];
    'organization.country'?: CountryCode[];
    'organization.houseNumber'?: string[];
    'organization.name'?: string[];
    'organization.street'?: string[];
    'organization.postalCode'?: string[];
    'organization.email'?: string[];
    'organization.city'?: string[];
    receiveProposalEmails?: boolean[] | string[];
  };
  disableableCredentialTypes?: any[];
  requiredActions?: KeycloakRequiredAction[];
  notBefore?: number;
  access?: {
    manageGroupMembership?: boolean;
    view?: boolean;
    mapRoles?: boolean;
    impersonate?: boolean;
    manage?: boolean;
  };
}
export interface IGetKeycloakUser extends IBaseKeycloakUser {
  id: string;
  createdTimestamp: number;
  totp: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ICreateKeycloakUser extends IBaseKeycloakUser {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ICachedKeycloakUser extends Pick<IGetKeycloakUser, 'id' | 'email' | 'attributes'> {}

// All existing attributes must be merged to the update. Otherwise only updated will be persisted
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IUpdateKeycloakProfile
  extends Pick<IBaseKeycloakUser, 'firstName' | 'lastName' | 'attributes' | 'email'> {}
