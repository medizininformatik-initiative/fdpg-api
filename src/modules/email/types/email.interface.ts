import { EmailCategory } from './email-category.enum';

export interface IEmailBase {
  to: string[];
  subject: string;
  categories?: (EmailCategory | `ENV:${string}`)[];
}

export type IEmail = IEmailBase & ({ text: string } | { html: string });
