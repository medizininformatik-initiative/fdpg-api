import { EmailCategory } from './email-category.enum';

export interface IEmailBase {
  to: string[];
  categories?: (EmailCategory | `ENV:${string}`)[];
}

export type IEmail = IEmailBase & { subject: string } & ({ text: string } | { html: string });

export type ITemplateEmail = IEmailBase & { subject?: string; templateId: number; params: Record<string, string> };
