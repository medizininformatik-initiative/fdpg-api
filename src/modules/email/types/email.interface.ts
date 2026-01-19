import { EmailCategory } from './email-category.enum';
import { TemplateEmailParamKeys } from './template-email-param-keys.types';

export interface IEmailBase {
  to: string[];
  categories?: (EmailCategory | `ENV:${string}`)[];
}

export type IEmail = IEmailBase & { subject: string } & ({ text: string } | { html: string });

export type ITemplateEmail = IEmailBase & {
  subject?: string;
  templateId: number;
  params: Partial<Record<TemplateEmailParamKeys, string | boolean | string[]>>;
};
