import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class ParseOptionalBodyPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    console.log({ value, metadata });
    if (metadata.type === 'body' && (value === null || value === undefined)) {
      return undefined;
    }
    return value;
  }
}
