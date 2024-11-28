import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { InitContractingDto } from './proposal/init-contracting.dto';

@Exclude()
export class ContractingUploadDto extends InitContractingDto {
  @ApiProperty({
    type: 'string',
    name: 'file',
    format: 'binary',
  })
  file: any;
}
