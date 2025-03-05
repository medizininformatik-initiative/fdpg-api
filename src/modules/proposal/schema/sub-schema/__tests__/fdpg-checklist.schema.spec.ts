import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { FdpgChecklist, FdpgChecklistSchema } from '../fdpg-checklist.schema';

describe('FdpgChecklist Schema', () => {
  beforeEach(async () => {
    await Test.createTestingModule({
      providers: [
        {
          provide: getModelToken(FdpgChecklist.name),
          useValue: {
            new: jest.fn().mockResolvedValue({}),
            constructor: jest.fn().mockResolvedValue({}),
            find: jest.fn(),
            findOne: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            exec: jest.fn(),
            schema: FdpgChecklistSchema,
          },
        },
      ],
    }).compile();
  });

  it('should create a new checklist with default values', () => {
    const checklist = new FdpgChecklist();
    expect(checklist.isRegistrationLinkSent).toBe(false);
    expect(checklist.fdpgInternalCheckNotes).toBeNull();
    expect(checklist.checkListVerification).toBeDefined();
    expect(checklist.projectProperties).toBeDefined();
  });

  it('should have the correct structure for checklist items', () => {
    const checklist = new FdpgChecklist();
    const firstChecklistItem = checklist.checkListVerification[0];

    expect(firstChecklistItem).toHaveProperty('_id');
    expect(firstChecklistItem).toHaveProperty('questionKey');
    expect(firstChecklistItem).toHaveProperty('comment');
    expect(firstChecklistItem).toHaveProperty('isMultiple');
    expect(firstChecklistItem).toHaveProperty('options');
    expect(firstChecklistItem).toHaveProperty('answer');
    expect(firstChecklistItem).toHaveProperty('sublist');
    expect(firstChecklistItem).toHaveProperty('isAnswered');
  });

  it('should have the correct structure for project properties', () => {
    const checklist = new FdpgChecklist();
    const firstProjectProperty = checklist.projectProperties[0];

    expect(firstProjectProperty).toHaveProperty('_id');
    expect(firstProjectProperty).toHaveProperty('questionKey');
    expect(firstProjectProperty).toHaveProperty('comment');
    expect(firstProjectProperty).toHaveProperty('isMultiple');
    expect(firstProjectProperty).toHaveProperty('options');
    expect(firstProjectProperty).toHaveProperty('answer');
    expect(firstProjectProperty).toHaveProperty('sublist');
    expect(firstProjectProperty).toHaveProperty('isAnswered');
  });

  it('should have the correct default values for checklist items', () => {
    const checklist = new FdpgChecklist();
    const firstChecklistItem = checklist.checkListVerification[0];

    expect(firstChecklistItem.comment).toBeNull();
    expect(firstChecklistItem.isMultiple).toBe(false);
    expect(firstChecklistItem.answer).toEqual([]);
    expect(firstChecklistItem.sublist).toEqual([]);
    expect(firstChecklistItem.isAnswered).toBe(false);
  });

  it('should have the correct default values for project properties', () => {
    const checklist = new FdpgChecklist();
    const firstProjectProperty = checklist.projectProperties[0];

    expect(firstProjectProperty.comment).toBeNull();
    expect(firstProjectProperty.isMultiple).toBe(false);
    expect(firstProjectProperty.answer).toEqual([]);
    expect(firstProjectProperty.sublist).toEqual([]);
    expect(firstProjectProperty.isAnswered).toBe(false);
  });

  it('should handle nested sublist items correctly', () => {
    const checklist = new FdpgChecklist();
    const extraStudyProtocol = checklist.checkListVerification.find(
      (item) => item.questionKey === 'extraStudyProtocol',
    );

    expect(extraStudyProtocol.sublist).toBeDefined();
    expect(extraStudyProtocol.sublist.length).toBeGreaterThan(0);
    expect(extraStudyProtocol.sublist[0]).toHaveProperty('_id');
    expect(extraStudyProtocol.sublist[0]).toHaveProperty('questionKey');
    expect(extraStudyProtocol.sublist[0]).toHaveProperty('comment');
    expect(extraStudyProtocol.sublist[0]).toHaveProperty('isMultiple');
    expect(extraStudyProtocol.sublist[0]).toHaveProperty('options');
    expect(extraStudyProtocol.sublist[0]).toHaveProperty('answer');
    expect(extraStudyProtocol.sublist[0]).toHaveProperty('sublist');
    expect(extraStudyProtocol.sublist[0]).toHaveProperty('isAnswered');
  });

  it('should handle nested sublist items in project properties correctly', () => {
    const checklist = new FdpgChecklist();
    const intlParticipants = checklist.projectProperties.find((item) => item.questionKey === 'Intl-Participants');

    expect(intlParticipants.sublist).toBeDefined();
    expect(intlParticipants.sublist.length).toBeGreaterThan(0);
    expect(intlParticipants.sublist[0]).toHaveProperty('_id');
    expect(intlParticipants.sublist[0]).toHaveProperty('questionKey');
    expect(intlParticipants.sublist[0]).toHaveProperty('comment');
    expect(intlParticipants.sublist[0]).toHaveProperty('isMultiple');
    expect(intlParticipants.sublist[0]).toHaveProperty('options');
    expect(intlParticipants.sublist[0]).toHaveProperty('answer');
    expect(intlParticipants.sublist[0]).toHaveProperty('sublist');
    expect(intlParticipants.sublist[0]).toHaveProperty('isAnswered');
  });
});
