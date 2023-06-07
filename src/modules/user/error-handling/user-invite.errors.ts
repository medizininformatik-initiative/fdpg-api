import { InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { ValidationErrorInfo } from 'src/shared/dto/validation/validation-error-info.dto';
import { BadRequestError } from 'src/shared/enums/bad-request-error.enum';
import { ResendInvitationDto } from '../dto/resend-invitation.dto';

export const handleActionsEmailError = (error: any) => {
  if (axios.isAxiosError(error)) {
    let isKeycloakErrorMessage = (error.response.data as any).errorMessage !== undefined;
    let isKeycloakError = (error.response.data as any).error !== undefined;

    if (isKeycloakErrorMessage) {
      let errorInfo: ValidationErrorInfo;
      let property: keyof ResendInvitationDto | 'userId';
      switch ((error.response.data as any).errorMessage) {
        case "Client doesn't exist":
          property = 'clientId';
          errorInfo = new ValidationErrorInfo({
            constraint: 'validClientId',
            message: 'ClientId does not exist',
            property,
            code: BadRequestError.KeycloakInvalidClientId,
          });
          throw new ValidationException([errorInfo]);

        case 'Invalid redirect uri.':
          property = 'redirectUri';
          errorInfo = new ValidationErrorInfo({
            constraint: 'validRedirectUri',
            message: 'Invalid redirect uri for given clientId',
            property,
            code: BadRequestError.KeycloakInvalidRedirectUri,
          });
          throw new ValidationException([errorInfo]);

        default:
          break;
      }
    } else if (isKeycloakError && (error.response.data as any).error === 'User not found') {
      const property: keyof ResendInvitationDto | 'userId' = 'userId';
      const errorInfo = new ValidationErrorInfo({
        constraint: 'existingUser',
        message: 'User not found',
        property,
        code: BadRequestError.KeycloakUserNotFound,
      });
      throw new ValidationException([errorInfo]);
    }
  }
  console.log(error);
  throw new InternalServerErrorException('Failed to execute actions email in keycloak');
};
