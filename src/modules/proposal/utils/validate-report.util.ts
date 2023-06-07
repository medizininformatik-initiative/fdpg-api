import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { REPORTS_MAX_UPLOAD_COUNT } from 'src/shared/constants/global.constants';
import { ValidationErrorInfo } from 'src/shared/dto/validation/validation-error-info.dto';
import { BadRequestError } from 'src/shared/enums/bad-request-error.enum';

export const validateReportUploads = (filesToKeep: string[], files: Express.Multer.File[]) => {
  const maxUploadsReached = filesToKeep.length + files.length > REPORTS_MAX_UPLOAD_COUNT;
  if (maxUploadsReached) {
    const errorInfo = new ValidationErrorInfo({
      constraint: 'maxUploadsReached',
      message: `One report can only contain up to ${REPORTS_MAX_UPLOAD_COUNT} uploads`,
      property: 'files',
      code: BadRequestError.ReportsMaxUploadCount,
    });
    throw new ValidationException([errorInfo]);
  }
};
