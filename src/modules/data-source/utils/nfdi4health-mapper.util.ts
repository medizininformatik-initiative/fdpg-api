import { Logger } from '@nestjs/common';
import { Language } from 'src/shared/enums/language.enum';
import { Nfdi4HealthContentItemDto } from '../dto/nfdi4health.dto';
import { DataSource } from '../schema/data-source.schema';
import { DataSourceStatus } from '../enum/data-source-status.enum';

/**
 * Utility class for mapping NFDI4Health data structures to our DataSource schema.
 * Handles language mapping, data transformation, and status preservation.
 */
export class Nfdi4HealthMapper {
  private static readonly logger = new Logger(Nfdi4HealthMapper.name);

  /**
   * Language mapping configuration.
   * Maps various NFDI4Health language formats to our Language enum.
   */
  private static readonly LANGUAGE_MAP: Record<string, Language> = {
    'EN (English)': Language.EN,
    'DE (German)': Language.DE,
    EN: Language.EN,
    DE: Language.DE,
    en: Language.EN,
    de: Language.DE,
  };

  /**
   * Maps NFDI4Health language string to our Language enum.
   *
   * @param nfdi4HealthLanguage - Language string from NFDI4Health (e.g., "EN (English)", "DE (German)")
   * @returns Mapped Language enum value or null if unmapped
   */
  static mapLanguage(nfdi4HealthLanguage: string): Language | null {
    const mapped = this.LANGUAGE_MAP[nfdi4HealthLanguage];

    if (!mapped) {
      this.logger.warn(`Unknown language format: "${nfdi4HealthLanguage}", skipping`);
    }

    return mapped || null;
  }

  /**
   * Maps an array of NFDI4Health language texts to our DataSourceLanguage format.
   * Filters out entries with unmapped languages.
   *
   * @param texts - Array of language text objects from NFDI4Health
   * @returns Array of mapped language objects with our enum values
   */
  static mapLanguageTexts(
    texts: Array<{ language: string; text: string }>,
  ): Array<{ language: Language; value: string }> {
    return texts
      .map((item) => {
        const language = this.mapLanguage(item.language);
        if (!language) {
          return null;
        }
        return {
          language,
          value: item.text,
        };
      })
      .filter((item) => item !== null) as Array<{
      language: Language;
      value: string;
    }>;
  }

  /**
   * Maps a single NFDI4Health content item to our DataSource schema.
   * Handles status preservation logic:
   * - Uses existing status or defaults to PENDING
   *
   * @param item - NFDI4Health content item to map
   * @param existingStatus - Optional existing status to preserve
   * @returns Partial DataSource object ready for database insertion/update
   */
  static mapToDataSource(item: Nfdi4HealthContentItemDto, existingStatus?: DataSourceStatus): Partial<DataSource> {
    const { resource, collections } = item;

    // Use first collection (studies typically belong to one main collection)
    const primaryCollection = collections[0];

    return {
      nfdi4healthId: resource.identifier,
      titles: this.mapLanguageTexts(resource.titles),
      descriptions: this.mapLanguageTexts(resource.descriptions),
      collection: primaryCollection?.name || 'Unknown',
      collectionId: primaryCollection?.id || 0,
      classification: resource.classification.type,
      status: existingStatus || DataSourceStatus.PENDING,
    };
  }
}
