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

      if (groups.includes(OutputGroup.FormSchemaOnly)) {
        return { ...options };
      }

      if (groups.includes(OutputGroup.WithFormSchema)) {
        return {
          ...options,
          value: value ?? null,
        };
      }

      return value;
    }),
  );
}

export function UiNested(typeFn: () => any, options?: { isArray: boolean }) {
  return applyDecorators(
    Expose({ groups: [OutputGroup.FormSchemaOnly, OutputGroup.WithFormSchema] }),

    Type(typeFn),

    ValidateNested({ each: options?.isArray }),
  );
}
