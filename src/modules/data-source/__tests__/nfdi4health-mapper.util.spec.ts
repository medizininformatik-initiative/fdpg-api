import { Nfdi4HealthMapper } from '../utils/nfdi4health-mapper.util';
import { Language } from 'src/shared/enums/language.enum';
import { DataSourceStatus, DataSourceOrigin } from '../enum/data-source-status.enum';
import { Nfdi4HealthContentItemDto } from '../dto/nfdi4health.dto';

describe('Nfdi4HealthMapper', () => {
  describe('mapLanguage', () => {
    it('should map "EN (English)" to Language.EN', () => {
      expect(Nfdi4HealthMapper.mapLanguage('EN (English)')).toBe(Language.EN);
    });

    it('should map "DE (German)" to Language.DE', () => {
      expect(Nfdi4HealthMapper.mapLanguage('DE (German)')).toBe(Language.DE);
    });

    it('should map "EN" to Language.EN', () => {
      expect(Nfdi4HealthMapper.mapLanguage('EN')).toBe(Language.EN);
    });

    it('should map "DE" to Language.DE', () => {
      expect(Nfdi4HealthMapper.mapLanguage('DE')).toBe(Language.DE);
    });

    it('should map lowercase "en" to Language.EN', () => {
      expect(Nfdi4HealthMapper.mapLanguage('en')).toBe(Language.EN);
    });

    it('should map lowercase "de" to Language.DE', () => {
      expect(Nfdi4HealthMapper.mapLanguage('de')).toBe(Language.DE);
    });

    it('should return null for unmapped language', () => {
      expect(Nfdi4HealthMapper.mapLanguage('FR')).toBeNull();
      expect(Nfdi4HealthMapper.mapLanguage('Spanish')).toBeNull();
    });
  });

  describe('mapLanguageTexts', () => {
    it('should map array of language texts correctly', () => {
      const input = [
        { language: 'EN (English)', text: 'English Title' },
        { language: 'DE (German)', text: 'German Title' },
      ];

      const result = Nfdi4HealthMapper.mapLanguageTexts(input);

      expect(result).toEqual([
        { language: Language.EN, value: 'English Title' },
        { language: Language.DE, value: 'German Title' },
      ]);
    });

    it('should filter out unmapped languages', () => {
      const input = [
        { language: 'EN', text: 'English Title' },
        { language: 'FR', text: 'French Title' },
        { language: 'DE', text: 'German Title' },
      ];

      const result = Nfdi4HealthMapper.mapLanguageTexts(input);

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { language: Language.EN, value: 'English Title' },
        { language: Language.DE, value: 'German Title' },
      ]);
    });

    it('should handle empty array', () => {
      const result = Nfdi4HealthMapper.mapLanguageTexts([]);
      expect(result).toEqual([]);
    });

    it('should handle array with all unmapped languages', () => {
      const input = [
        { language: 'FR', text: 'French Title' },
        { language: 'ES', text: 'Spanish Title' },
      ];

      const result = Nfdi4HealthMapper.mapLanguageTexts(input);
      expect(result).toEqual([]);
    });
  });

  describe('mapToDataSource', () => {
    const createMockItem = (overrides: any = {}): Nfdi4HealthContentItemDto => ({
      resource: {
        identifier: 'TEST-001',
        titles: [
          { language: 'EN (English)', text: 'Test Study' },
          { language: 'DE (German)', text: 'Test Studie' },
        ],
        descriptions: [
          { language: 'EN (English)', text: 'Test Description' },
          { language: 'DE (German)', text: 'Test Beschreibung' },
        ],
        classification: { type: 'Study' },
        ...overrides.resource,
      },
      collections:
        overrides.collections !== undefined
          ? overrides.collections
          : [
              {
                id: 123,
                name: 'Test Collection',
                alias: 'test-collection',
              },
            ],
    });

    it('should map NFDI4Health item to DataSource schema', () => {
      const item = createMockItem();

      const result = Nfdi4HealthMapper.mapToDataSource(item);

      expect(result).toEqual({
        externalIdentifier: 'TEST-001',
        origin: DataSourceOrigin.NFDI4HEALTH,
        titles: [
          { language: Language.EN, value: 'Test Study' },
          { language: Language.DE, value: 'Test Studie' },
        ],
        descriptions: [
          { language: Language.EN, value: 'Test Description' },
          { language: Language.DE, value: 'Test Beschreibung' },
        ],
        collection: 'Test Collection',
        classification: 'Study',
        status: DataSourceStatus.PENDING,
      });
    });

    it('should use existing status when provided', () => {
      const item = createMockItem();

      const result = Nfdi4HealthMapper.mapToDataSource(item, DataSourceStatus.APPROVED);

      expect(result.status).toBe(DataSourceStatus.APPROVED);
    });

    it('should default to PENDING status when not provided', () => {
      const item = createMockItem();

      const result = Nfdi4HealthMapper.mapToDataSource(item);

      expect(result.status).toBe(DataSourceStatus.PENDING);
    });

    it('should handle item with no collections', () => {
      const item = createMockItem({ collections: [] });

      const result = Nfdi4HealthMapper.mapToDataSource(item);

      expect(result.collection).toBe('Unknown');
    });

    it('should use first collection when multiple exist', () => {
      const item = createMockItem({
        collections: [
          { id: 1, name: 'First Collection', alias: 'first' },
          { id: 2, name: 'Second Collection', alias: 'second' },
        ],
      });

      const result = Nfdi4HealthMapper.mapToDataSource(item);

      expect(result.collection).toBe('First Collection');
    });

    it('should filter out unmapped languages in titles and descriptions', () => {
      const item = createMockItem({
        resource: {
          identifier: 'TEST-002',
          titles: [
            { language: 'EN', text: 'English Title' },
            { language: 'FR', text: 'French Title' },
          ],
          descriptions: [
            { language: 'DE', text: 'German Description' },
            { language: 'ES', text: 'Spanish Description' },
          ],
          classification: { type: 'Study' },
        },
      });

      const result = Nfdi4HealthMapper.mapToDataSource(item);

      expect(result.titles).toHaveLength(1);
      expect(result.titles).toEqual([{ language: Language.EN, value: 'English Title' }]);

      expect(result.descriptions).toHaveLength(1);
      expect(result.descriptions).toEqual([{ language: Language.DE, value: 'German Description' }]);
    });

    it('should handle different classification types', () => {
      const item = createMockItem({
        resource: {
          identifier: 'TEST-003',
          titles: [{ language: 'EN', text: 'Test' }],
          descriptions: [],
          classification: { type: 'Registry' },
        },
      });

      const result = Nfdi4HealthMapper.mapToDataSource(item);

      expect(result.classification).toBe('Registry');
    });

    it('should preserve PENDING status when provided', () => {
      const item = createMockItem();

      const result = Nfdi4HealthMapper.mapToDataSource(item, DataSourceStatus.PENDING);

      expect(result.status).toBe(DataSourceStatus.PENDING);
    });

    it('should set origin to NFDI4HEALTH', () => {
      const item = createMockItem();

      const result = Nfdi4HealthMapper.mapToDataSource(item);

      expect(result.origin).toBe(DataSourceOrigin.NFDI4HEALTH);
    });

    it('should handle empty titles and descriptions arrays', () => {
      const item = createMockItem({
        resource: {
          identifier: 'TEST-004',
          titles: [],
          descriptions: [],
          classification: { type: 'Study' },
        },
      });

      const result = Nfdi4HealthMapper.mapToDataSource(item);

      expect(result.titles).toEqual([]);
      expect(result.descriptions).toEqual([]);
    });
  });
});
