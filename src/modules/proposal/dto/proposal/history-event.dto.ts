import { MiiLocation } from 'src/shared/constants/mii-locations';
import { Exclude, Expose } from 'class-transformer';
import { Version } from 'src/shared/schema/version.schema';
import { HistoryEventType } from '../../enums/history-event.enum';

@Exclude()
export class HistoryEventGetDto {
  @Expose()
  type: HistoryEventType;

  @Expose()
  proposalVersion: Version;

  @Expose()
  createdAt: Date;

  @Expose()
  location: MiiLocation;

  @Expose()
  data: Record<string, string | number>;
}
