import { Injectable } from '@nestjs/common';
import { GeneralValidationPipe } from 'src/shared/validators/general-validation.pipe';

// Attention: Pipe will return the transformed object and not the input value!
// This might cause stripping out properties and therefore unexpected behavior!
@Injectable()
export class AdminValidationPipe extends GeneralValidationPipe {}
