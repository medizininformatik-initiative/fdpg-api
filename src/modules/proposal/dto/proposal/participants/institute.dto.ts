import { Expose, Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, MaxLength, ValidateIf } from 'class-validator';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { UiWidget } from 'src/shared/decorators/ui-widget.decorator';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';
import { CountryCode } from 'src/shared/enums/country-code.enum';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';
import { IsPostalCodeOf } from 'src/shared/validators/is-postal-code-of.validator';

export default class InstituteDto extends WithIdForObjectDto {
  @Expose()
  @IsOptional()
  @UiWidget({ type: 'select', format: 'single' })
  miiLocation?: string;

  @Expose()
  @MaxLength(1000)
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  // ↓ There should be MiiLocation or all other fields filled
  @ValidateIf((o) => !o.miiLocation)
  @Transform(({ obj, value }) => (obj.miiLocation ? undefined : value))
  // ↑ There should be MiiLocation or all other fields filled
  @UiWidget({ type: 'textfield' })
  name?: string;

  @Expose()
  @MaxLength(500)
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  // ↓ There should be MiiLocation or all other fields filled
  @ValidateIf((o) => !o.miiLocation)
  @Transform(({ obj, value }) => (obj.miiLocation ? undefined : value))
  // ↑ There should be MiiLocation or all other fields filled
  @UiWidget({ type: 'textfield' })
  streetAddress?: string;

  @Expose()
  @MaxLength(25)
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  // ↓ There should be MiiLocation or all other fields filled
  @ValidateIf((o) => !o.miiLocation)
  @Transform(({ obj, value }) => (obj.miiLocation ? undefined : value))
  // ↑ There should be MiiLocation or all other fields filled
  @UiWidget({ type: 'textfield' })
  houseNumber?: string;

  @Expose()
  @IsPostalCodeOf('country')
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  // ↓ There should be MiiLocation or all other fields filled
  @ValidateIf((o) => !o.miiLocation)
  @Transform(({ obj, value }) => (obj.miiLocation ? undefined : value))
  // ↑ There should be MiiLocation or all other fields filled
  @UiWidget({ type: 'textfield' })
  postalCode?: string;

  @Expose()
  @MaxLength(250)
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  // ↓ There should be MiiLocation or all other fields filled
  @ValidateIf((o) => !o.miiLocation)
  @Transform(({ obj, value }) => (obj.miiLocation ? undefined : value))
  @UiWidget({ type: 'textfield' })
  // ↑ There should be MiiLocation or all other fields filled
  city?: string;

  @Expose()
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  @IsEnum(CountryCode)
  // ↓ There should be MiiLocation or all other fields filled
  @ValidateIf((o) => !o.miiLocation)
  @Transform(({ obj, value }) => (obj.miiLocation ? undefined : value))
  @UiWidget({ type: 'select', format: 'single' })
  // ↑ There should be MiiLocation or all other fields filled
  country?: CountryCode;

  @Expose()
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  @IsEmail()
  // ↓ There should be MiiLocation or all other fields filled
  @ValidateIf((o) => !o.miiLocation)
  @Transform(({ obj, value }) => (obj.miiLocation ? undefined : value))
  @UiWidget({ type: 'textfield', format: 'email' })
  // ↑ There should be MiiLocation or all other fields filled
  email?: string;
}
