import { Expose } from 'class-transformer';
import { ExposeId } from 'src/shared/decorators/transform/expose-id.decorator';
import { FdpgTaskType } from '../../enums/fdpg-task-type.enum';

export class FdpgTaskGetDto {
  @Expose()
  type: FdpgTaskType;

  @ExposeId()
  _id: string;
}
