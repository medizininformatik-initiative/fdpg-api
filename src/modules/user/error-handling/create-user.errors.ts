import { ConflictException, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { ValidationErrorInfo } from 'src/shared/dto/validation/validation-error-info.dto';
import { BadRequestError } from 'src/shared/enums/bad-request-error.enum';
import { CreateUserDto } from '../dto/create-user.dto';

export const throwInvalidLocation = () => {
  const property: keyof CreateUserDto = 'location';
  const errorInfo = new ValidationErrorInfo({
    constraint: 'validLocationForRole',
    message: 'Role requires to set a valid location',
    property,
    code: BadRequestError.KeycloakInvalidLocationForRole,
  });
  throw new ValidationException([errorInfo]);
};

export const handleRegisterErrors = (error: any) => {
  if (axios.isAxiosError(error) && error.response.status === 409) {
    throw new ConflictException(error.response.data);
  }
  console.log(error);
  throw new InternalServerErrorException('Failed to create the user in keycloak');
};
