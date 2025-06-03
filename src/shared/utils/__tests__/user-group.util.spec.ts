import { Role } from 'src/shared/enums/role.enum';
import { convertUserToGroups, parseGroupToUser, PartialUser } from '../user-group.utils';
import { SharedValidationGroup } from 'src/shared/enums/validation-group.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';

describe('convertUserToGroups', () => {
  it('includes only UserId and UserRole when no miiLocation or assignedDataSources', () => {
    const user = {
      userId: 'user-123',
      singleKnownRole: Role.Researcher,
    } as any as IRequestUser;

    const groups = convertUserToGroups(user);
    expect(groups).toContain(`${SharedValidationGroup.UserId}_user-123`);
    expect(groups).toContain(`${SharedValidationGroup.UserRole}_${Role.Researcher}`);
    expect(groups).toHaveLength(2);
  });

  it('includes UserLocation when miiLocation is present', () => {
    const user = {
      userId: 'user-456',
      singleKnownRole: Role.DizMember,
      miiLocation: MiiLocation.UKL,
    } as any as IRequestUser;

    const groups = convertUserToGroups(user);
    expect(groups).toContain(`${SharedValidationGroup.UserId}_user-456`);
    expect(groups).toContain(`${SharedValidationGroup.UserRole}_${Role.DizMember}`);
    expect(groups).toContain(`${SharedValidationGroup.UserLocation}_UKL`);
    expect(groups).toHaveLength(3);
  });

  it('includes one UserDataSource per assignedDataSources entry', () => {
    const user = {
      userId: 'user-789',
      singleKnownRole: Role.DataSourceMember,
      assignedDataSources: [PlatformIdentifier.Mii, PlatformIdentifier.DIFE],
    } as any as IRequestUser;

    const groups = convertUserToGroups(user);
    expect(groups).toContain(`${SharedValidationGroup.UserId}_user-789`);
    expect(groups).toContain(`${SharedValidationGroup.UserRole}_${Role.DataSourceMember}`);
    expect(groups).toContain(`${SharedValidationGroup.UserDataSource}_MII`);
    expect(groups).toContain(`${SharedValidationGroup.UserDataSource}_DIFE`);
    expect(groups).toHaveLength(4);
  });

  it('includes UserLocation and multiple UserDataSource entries', () => {
    const user = {
      userId: 'user-000',
      singleKnownRole: Role.UacMember,
      miiLocation: MiiLocation.UKL,
      assignedDataSources: [PlatformIdentifier.DIFE, PlatformIdentifier.Mii],
    } as any as IRequestUser;

    const groups = convertUserToGroups(user);
    expect(groups).toContain(`${SharedValidationGroup.UserId}_user-000`);
    expect(groups).toContain(`${SharedValidationGroup.UserRole}_${Role.UacMember}`);
    expect(groups).toContain(`${SharedValidationGroup.UserLocation}_UKL`);
    expect(groups).toContain(`${SharedValidationGroup.UserDataSource}_MII`);
    expect(groups).toContain(`${SharedValidationGroup.UserDataSource}_DIFE`);
    expect(groups).toHaveLength(5);
  });
});

describe('parseGroupToUser', () => {
  it('returns default PartialUser when given empty array', () => {
    const result = parseGroupToUser([]);
    expect(result).toEqual<PartialUser>({
      userId: undefined,
      singleKnownRole: undefined,
      miiLocation: undefined,
      assignedDataSources: [],
    });
  });

  it('parses userId from a UserId group', () => {
    const group = `${SharedValidationGroup.UserId}_testUser`;
    const result = parseGroupToUser([group]);
    expect(result.userId).toBe('testUser');
    expect(result.singleKnownRole).toBeUndefined();
    expect(result.miiLocation).toBeUndefined();
    expect(result.assignedDataSources).toEqual([]);
  });

  it('parses singleKnownRole from a UserRole group', () => {
    const group = `${SharedValidationGroup.UserRole}_${Role.FdpgMember}`;
    const result = parseGroupToUser([group]);
    expect(result.singleKnownRole).toBe(Role.FdpgMember);
    expect(result.userId).toBeUndefined();
    expect(result.miiLocation).toBeUndefined();
    expect(result.assignedDataSources).toEqual([]);
  });

  it('parses miiLocation from a UserLocation group', () => {
    const group = `${SharedValidationGroup.UserLocation}_LOC123`;
    const result = parseGroupToUser([group]);
    expect(result.miiLocation).toBe('LOC123');
    expect(result.userId).toBeUndefined();
    expect(result.singleKnownRole).toBeUndefined();
    expect(result.assignedDataSources).toEqual([]);
  });

  it('parses multiple assignedDataSources from UserDataSource groups', () => {
    const dsGroup1 = `${SharedValidationGroup.UserDataSource}_Mii`;
    const dsGroup2 = `${SharedValidationGroup.UserDataSource}_Nak`;
    const result = parseGroupToUser([dsGroup1, dsGroup2]);
    expect(result.assignedDataSources).toContain('Mii');
    expect(result.assignedDataSources).toContain('Nak');
    expect(result.userId).toBeUndefined();
    expect(result.singleKnownRole).toBeUndefined();
    expect(result.miiLocation).toBeUndefined();
  });

  it('parses all fields when multiple group types are provided', () => {
    const groups = [
      `${SharedValidationGroup.UserId}_u1`,
      `${SharedValidationGroup.UserRole}_${Role.Researcher}`,
      `${SharedValidationGroup.UserLocation}_LOC_A`,
      `${SharedValidationGroup.UserDataSource}_Mii`,
      `${SharedValidationGroup.UserDataSource}_Nak`,
    ];
    const result = parseGroupToUser(groups);
    expect(result.userId).toBe('u1');
    expect(result.singleKnownRole).toBe(Role.Researcher);
    expect(result.miiLocation).toBe('LOC_A');
    expect(result.assignedDataSources).toEqual(['Mii', 'Nak']);
  });

  it('ignores unknown group strings', () => {
    const groups = ['RANDOM_group', `${SharedValidationGroup.UserId}_u2`];
    const result = parseGroupToUser(groups);
    expect(result.userId).toBe('u2');
    expect(result.singleKnownRole).toBeUndefined();
    expect(result.miiLocation).toBeUndefined();
    expect(result.assignedDataSources).toEqual([]);
  });
});
