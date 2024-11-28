import { Expose, plainToClass, Transform } from 'class-transformer';
import { Role } from 'src/shared/enums/role.enum';
import { parseGroupToUser, PartialUser } from 'src/shared/utils/user-group.utils';

import { UploadDto, UploadGetDto } from '../dto/upload.dto';
import { DirectUpload, UploadType, UseCaseUpload } from '../enums/upload-type.enum';

const generalAccessTypes = [
  DirectUpload.EthicVote,
  DirectUpload.EthicVoteDeclarationOfNonResponsibility,
  DirectUpload.GeneralAppendix,
  UseCaseUpload.ContractDraft,
  UseCaseUpload.FeasibilityQuery,
  UseCaseUpload.ProposalPDF,
  UseCaseUpload.ReportUpload,
] as UploadType[];
export const ExposeUpload = () => (target: object, propertyKey: string) => {
  Expose()(target, propertyKey);
  Transform((params) => {
    const user = parseGroupToUser(params.options.groups);

    return params.obj[propertyKey]
      ? params.obj[propertyKey]
          .filter((upload: UploadDto) => {
            if (generalAccessTypes.includes(upload.type)) {
              return true;
            }
            return checkAccessForUser(user, upload);
          })
          .map((upload) => plainToClass(UploadGetDto, upload))
      : [];
  })(target, propertyKey);
};

const checkAccessForUser = (user: PartialUser, upload: UploadDto): boolean => {
  if (user.singleKnownRole === Role.FdpgMember || user.singleKnownRole === Role.Researcher) {
    return true;
  }

  const isFromLocation = user.singleKnownRole === Role.DizMember || user.singleKnownRole === Role.UacMember;
  if (isFromLocation && upload.owner.miiLocation === user.miiLocation) {
    return true;
  }
};
