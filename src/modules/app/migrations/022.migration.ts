import { Injectable } from '@nestjs/common';
import { IDbMigration } from '../types/db-migration.interface';
import { ProposalFormService } from 'src/modules/proposal-form/proposal-form.service';

@Injectable()
export class Migration022 implements IDbMigration {
  constructor(private proposalFormService: ProposalFormService) {}

  async up(): Promise<void> {
    console.log('Starting migration 022: Add schema to proposal application form v1');
    try {
      const recentForm = await this.proposalFormService.findMostRecentProposalForm();
      const currentSchemaFromDto = this.proposalFormService.getProposalUiSchema();

      recentForm.formSchema = currentSchemaFromDto;

      await recentForm.save();

      console.log(`Migration 022: Added schema`);
    } catch (error) {
      console.error('Error in migration 022:', error);
      throw error;
    }
  }

  async down(): Promise<void> {}
}
