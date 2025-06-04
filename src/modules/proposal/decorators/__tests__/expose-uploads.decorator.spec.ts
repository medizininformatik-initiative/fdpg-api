// ExposeUpload.spec.ts

import 'reflect-metadata';
import { instanceToPlain } from 'class-transformer';
import { DirectUpload, UseCaseUpload } from '../../enums/upload-type.enum';
import { ExposeUpload } from '../expose-uploads.decorator';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { parseGroupToUser } from 'src/shared/utils/user-group.utils';
import { Role } from 'src/shared/enums/role.enum';

jest.mock('src/shared/utils/user-group.utils', () => ({
  parseGroupToUser: jest.fn(),
}));

interface UploadDto {
  type: DirectUpload | UseCaseUpload | unknown;
  blobName: string;
  fileName: string;
  owner: { miiLocation: string };
}

class Container {
  @ExposeUpload()
  uploads!: UploadDto[];
}

describe('ExposeUpload decorator – full branch coverage', () => {
  const FakeType = 'FAKE_TYPE' as unknown as UseCaseUpload;

  let uploads: UploadDto[];

  beforeEach(() => {
    uploads = [
      // 1. In generalAccessTypes: DirectUpload.EthicVote
      { type: DirectUpload.EthicVote, blobName: 'a', fileName: 'a', owner: { miiLocation: 'LOC1' } },

      // 2. In generalAccessTypes: UseCaseUpload.ReportUpload
      { type: UseCaseUpload.ReportUpload, blobName: 'b', fileName: 'b', owner: { miiLocation: 'LOC2' } },

      // 3. Not in generalAccessTypes: FakeType
      { type: FakeType, blobName: 'x', fileName: 'x', owner: { miiLocation: 'LOC_X' } },
    ];
  });

  function serializeWithGroups(groups: string[]) {
    const container = new Container();
    container.uploads = uploads;
    return instanceToPlain(container, { groups });
  }

  describe('filter – upload.type ∈ generalAccessTypes', () => {
    it('always includes uploads of type DirectUpload.EthicVote', () => {
      (parseGroupToUser as jest.Mock).mockReturnValue({
        singleKnownRole: Role.Researcher,
      });

      const plain = serializeWithGroups(['any']);
      const received: any[] = (plain as any).uploads;

      // The first upload is DirectUpload.EthicVote → included unconditionally
      expect(received.some((u) => u.fileName === 'a')).toBe(true);
    });

    it('always includes uploads of type UseCaseUpload.ReportUpload', () => {
      (parseGroupToUser as jest.Mock).mockReturnValue({
        singleKnownRole: Role.DataSourceMember,
        assignedDataSources: [PlatformIdentifier.Mii],
      });

      const plain = serializeWithGroups(['ds']);
      const received: any[] = (plain as any).uploads;

      // The second upload is ReportUpload → included unconditionally
      expect(received.some((u) => u.fileName === 'b')).toBe(true);
    });
  });

  describe('filter – upload.type ∉ generalAccessTypes (FakeType)', () => {
    it('includes FakeType for FDPG member (second Iif returns true)', () => {
      (parseGroupToUser as jest.Mock).mockReturnValue({
        singleKnownRole: Role.FdpgMember,
        assignedDataSources: [],
      });

      const plain = serializeWithGroups(['fdpg']);
      const received: any[] = (plain as any).uploads;

      // Third upload has type FakeType, so first branch fails; second Iif matches FDPG → included
      expect(received.some((u) => u.fileName === 'x')).toBe(true);
    });

    it('includes FakeType for DataSourceMember (second Iif returns true)', () => {
      (parseGroupToUser as jest.Mock).mockReturnValue({
        singleKnownRole: Role.DataSourceMember,
        assignedDataSources: [],
      });

      const plain = serializeWithGroups(['ds']);
      const received: any[] = (plain as any).uploads;

      expect(received.some((u) => u.fileName === 'x')).toBe(true);
    });

    it('includes FakeType for Researcher (second Iif returns true)', () => {
      (parseGroupToUser as jest.Mock).mockReturnValue({
        singleKnownRole: Role.Researcher,
      });

      const plain = serializeWithGroups(['res']);
      const received: any[] = (plain as any).uploads;

      expect(received.some((u) => u.fileName === 'x')).toBe(true);
    });

    it('includes FakeType for DizMember when owner.miiLocation matches', () => {
      (parseGroupToUser as jest.Mock).mockReturnValue({
        singleKnownRole: Role.DizMember,
        miiLocation: 'LOC_X',
      });

      const plain = serializeWithGroups(['diz']);
      const received: any[] = (plain as any).uploads;

      // Owner.miiLocation of the FakeType upload is 'LOC_X' → included
      expect(received.some((u) => u.fileName === 'x')).toBe(true);
    });

    it('excludes FakeType for DizMember when owner.miiLocation does not match', () => {
      (parseGroupToUser as jest.Mock).mockReturnValue({
        singleKnownRole: Role.DizMember,
        miiLocation: 'LOC_OTHER',
      });

      const plain = serializeWithGroups(['diz']);
      const received: any[] = (plain as any).uploads;

      // Owner.miiLocation is 'LOC_X', user.miiLocation is 'LOC_OTHER' → excluded
      expect(received.every((u) => u.fileName !== 'x')).toBe(true);
    });

    it('includes FakeType for UacMember when owner.miiLocation matches', () => {
      (parseGroupToUser as jest.Mock).mockReturnValue({
        singleKnownRole: Role.UacMember,
        miiLocation: 'LOC_X',
      });

      const plain = serializeWithGroups(['uac']);
      const received: any[] = (plain as any).uploads;

      expect(received.some((u) => u.fileName === 'x')).toBe(true);
    });

    it('excludes FakeType for UacMember when owner.miiLocation does not match', () => {
      (parseGroupToUser as jest.Mock).mockReturnValue({
        singleKnownRole: Role.UacMember,
        miiLocation: 'LOC_OTHER',
      });

      const plain = serializeWithGroups(['uac']);
      const received: any[] = (plain as any).uploads;

      expect(received.every((u) => u.fileName !== 'x')).toBe(true);
    });

    it('excludes FakeType for a user with no matching role (e.g., FdpgMember mis-typed role)', () => {
      (parseGroupToUser as jest.Mock).mockReturnValue({
        singleKnownRole: 'UNKNOWN_ROLE',
      });

      const plain = serializeWithGroups(['none']);
      const received: any[] = (plain as any).uploads;

      expect(received.every((u) => u.fileName !== 'x')).toBe(true);
    });
  });
});
