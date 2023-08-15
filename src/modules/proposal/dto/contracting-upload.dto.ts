import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { InitContractingDto } from './proposal/init-contracting.dto';

@Exclude()
export class ContractingUploadDto extends InitContractingDto {
  @ApiProperty({
    type: 'file',
    name: 'file',
    properties: {
      file: {
        type: 'string',
        format: 'binary',
      },
    },
  })
  file: any;
}
