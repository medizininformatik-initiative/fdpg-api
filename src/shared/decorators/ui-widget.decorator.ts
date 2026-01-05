import { applyDecorators } from '@nestjs/common';
import { Transform, Expose, Type } from 'class-transformer';
import { OutputGroup } from '../enums/output-group.enum';
import { ValidateNested } from 'class-validator';

export interface UiWidgetOptions {
  type: 'textfield' | 'datepicker' | 'richtext' | 'checkbox' | 'select';
  format?: 'email' | 'number' | 'single' | 'multiple';
  [key: string]: any;
}

export function UiWidget(options: UiWidgetOptions) {
  return applyDecorators(
    Expose({ groups: [OutputGroup.FormSchemaOnly, OutputGroup.WithFormSchema] }),
    Transform(({ value, options: transformOptions }) => {
      const groups = transformOptions?.groups || [];

      if (groups.includes(OutputGroup.FormSchemaOnly) || groups.includes(OutputGroup.WithFormSchema)) {
        const isSchemaOnly = transformOptions?.groups?.includes(OutputGroup.FormSchemaOnly);

        const returnValue = (() => {
          if (isSchemaOnly) {
            return undefined;
          } else {
            return value ?? null;
          }
        })();

        return {
          ...options,
          value: returnValue,
        };
      } else {
        return value;
      }
    }),
  );
}

export function UiNested(typeFn: () => any, options?: { isArray: boolean }) {
  return applyDecorators(
    // 1. Open the "Hallway" for your Form Groups
    Expose({ groups: [OutputGroup.FormSchemaOnly, OutputGroup.WithFormSchema] }),

    // 2. Transformer handles arrays automatically!
    Type(typeFn),

    // 3. Validator needs to know if it should check an array
    ValidateNested({ each: options?.isArray }),
  );
}
