import { IsEnum } from 'class-validator';
import { PanelQuery } from '../enums/panel-query.enum';

export class ProposalFilterDto {
  @IsEnum(PanelQuery)
  panelQuery: PanelQuery;
}
