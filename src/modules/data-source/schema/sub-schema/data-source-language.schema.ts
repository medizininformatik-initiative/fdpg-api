import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Language } from 'src/shared/enums/language.enum';

export type DataSourceLanguageDocument = DataSourceLanguage & Document;

/**
 * DataSourceLanguage Sub-Schema
 *
 * Represents a language-specific text entry for multilingual fields.
 * Used for titles, descriptions, and other translated content.
 */
@Schema({
  _id: false,
  versionKey: false,
})
export class DataSourceLanguage {
  /**
   * Language code (ISO 639-1 format).
   * Examples: "en" (English), "de" (German)
   */
  @Prop({
    type: String,
    enum: Object.values(Language),
    required: true,
  })
  language: Language;

  /**
   * The text content in the specified language.
   */
  @Prop({
    type: String,
    required: true,
  })
  value: string;
}

const DataSourceLanguageSchema = SchemaFactory.createForClass(DataSourceLanguage);

export { DataSourceLanguageSchema };
