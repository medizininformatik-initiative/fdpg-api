import { IFeasibilityResultDetailed } from './feasibility-result-detailed.interface';

export interface IFeasibilityResultDetailedResponse {
  totalNumberOfPatients: number;
  queryId: string;
  resultLines: IFeasibilityResultDetailed[];
}
