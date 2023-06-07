import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { SupportedMimetype } from 'src/modules/proposal/enums/supported-mime-type.enum';
import { ValidationErrorInfo } from '../dto/validation/validation-error-info.dto';
import { BadRequestError } from '../enums/bad-request-error.enum';

const throwInvalidMimetype = (mimetype: string, supportedMimetypes: SupportedMimetype[]) => {
  const property = 'file.mimetype';
  const errorInfo = new ValidationErrorInfo({
    constraint: 'validMimetype',
    message: `Invalid mime type: "${mimetype}". Upload requires a valid mime type: ${supportedMimetypes.join(', \n')}`,
    property,
    code: BadRequestError.UploadMimetypeNotSupported,
  });
  throw new ValidationException([errorInfo]);
};

export const validateMimetype = (
  file: Pick<Express.Multer.File, 'mimetype'>,
  supportedMimetypes: SupportedMimetype[],
) => {
  const isSupportedMimetype = supportedMimetypes.includes(file.mimetype as SupportedMimetype);
  if (!isSupportedMimetype) {
    throwInvalidMimetype(file.mimetype, supportedMimetypes);
  }
};
