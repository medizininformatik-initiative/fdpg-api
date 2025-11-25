import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProposalForm, ProposalFormSchema } from './schema/proposal-form.schema';
import { ProposalFormService } from './proposal-form.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: ProposalForm.name, schema: ProposalFormSchema }])],
  providers: [ProposalFormService],
  exports: [ProposalFormService, MongooseModule],
})
export class ProposalFormModule {}
