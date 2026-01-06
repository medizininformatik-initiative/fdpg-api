import { applyDecorators } from '@nestjs/common';
import { Transform, Expose, Type } from 'class-transformer';
import { OutputGroup } from '../enums/output-group.enum';
import { IsOptional, ValidateNested } from 'class-validator';

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
    Expose({ groups: [OutputGroup.FormSchemaOnly, OutputGroup.WithFormSchema] }),

    Type(typeFn),

    ValidateNested({ each: options?.isArray }),
  );
}
