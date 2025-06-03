// transform-utils.spec.ts

import 'reflect-metadata';
import { ArgumentMetadata } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { transForm, tryPlainToClass, getErrorMessages } from '../validation-pipe.utils'; // <-- adjust path as needed
import { FileDto } from 'src/shared/dto/file.dto';
import { ValidationException } from 'src/exceptions/validation/validation.exception';

// A dummy class for testing `transForm`/`tryPlainToClass`
class DummyDto {
  prop!: string;
}

describe('transForm', () => {
  it('returns an instance of the class when given a plain object', () => {
    const input = { prop: 'value' };
    const result = transForm(input, DummyDto, {});
    expect(result).toBeInstanceOf(DummyDto);
    // Additionally, plainToClass maps the property
    expect((result as DummyDto).prop).toBe('value');
  });

  it('throws an Error when the input is not an object', () => {
    // e.g., a string
    expect(() => transForm('not-an-object' as any, DummyDto, {})).toThrowError('Expected value to be of type object');
  });
});

describe('tryPlainToClass', () => {
  let metadata: ArgumentMetadata;

  beforeEach(() => {
    metadata = {
      type: undefined,
      metatype: DummyDto,
      data: undefined,
    } as ArgumentMetadata;
  });

  describe('file‐object branch', () => {
    it('returns FileDto instance when value has file fields', () => {
      const file = {
        fieldname: 'file',
        encoding: '7bit',
        size: 123,
        mimetype: 'text/plain',
      };
      // Add an extra property to ensure plainToClass will pick it up
      Object.assign(file, { extra: 'test' });

      const result = tryPlainToClass(file, metadata, {});
      expect(result).toBeInstanceOf(FileDto);
      // FileDto should have mapped the “extra” property if defined
      expect((result as any).extra).toBe('test');
    });

    it('returns array of FileDto instances when value is array of file objects', () => {
      const file1 = { fieldname: 'f1', encoding: '7bit', size: 10, mimetype: 'text/plain' };
      const file2 = { fieldname: 'f2', encoding: '8bit', size: 20, mimetype: 'image/png' };
      const arr = [file1, file2];

      const result = tryPlainToClass(arr, metadata, {});
      expect(Array.isArray(result)).toBe(true);
      expect((result as any[])[0]).toBeInstanceOf(FileDto);
      expect((result as any[])[1]).toBeInstanceOf(FileDto);
      expect((result as any[])[0].fieldname).toBe('f1');
      expect((result as any[])[1].mimetype).toBe('image/png');
    });
  });
});

describe('getErrorMessages', () => {
  it('extracts ValidationErrorInfo from a single‐level ValidationError with constraints', () => {
    const err = new ValidationError();
    err.property = 'fieldA';
    err.constraints = {
      isNotEmpty: 'fieldA should not be empty',
      isString: 'fieldA must be a string',
    };
    // Provide contexts to test code extraction
    err.contexts = {
      isNotEmpty: ['ERR_EMPTY'],
      isString: ['ERR_STRING'],
    };
    err.children = [];

    const result = getErrorMessages([err], []);
    expect(result).toHaveLength(2);

    const keys = result.map((i) => i.constraint);
    expect(keys).toContain('isNotEmpty');
    expect(keys).toContain('isString');

    const messages = result.map((i) => i.message);
    expect(messages).toContain('fieldA should not be empty');
    expect(messages).toContain('fieldA must be a string');

    const properties = result.map((i) => i.property);
    expect(properties.every((p) => p === 'fieldA')).toBe(true);

    const codes = result.map((i) => i.code);
    expect(codes).toContain('ERR_EMPTY');
    expect(codes).toContain('ERR_STRING');
  });

  it('recursively extracts from nested ValidationError children with scope prefix', () => {
    // Parent error has no constraints but one child
    const parent = new ValidationError();
    parent.property = 'parent';
    parent.constraints = undefined;

    const child = new ValidationError();
    child.property = 'child';
    child.constraints = { isNumber: 'child must be a number' };
    child.contexts = { isNumber: ['ERR_NUM'] };
    child.children = [];

    parent.children = [child];

    const result = getErrorMessages([parent], []);
    expect(result).toHaveLength(1);
    const info = result[0];
    // Property should be "parent.child"
    expect(info.property).toBe('parent.child');
    expect(info.constraint).toBe('isNumber');
    expect(info.message).toBe('child must be a number');
    expect(info.code).toBe('ERR_NUM');
  });

  it('handles ValidationError without contexts (code undefined)', () => {
    const err = new ValidationError();
    err.property = 'fieldB';
    err.constraints = { minLength: 'fieldB is too short' };
    // contexts is undefined by default
    err.children = [];

    const result = getErrorMessages([err], ['scope1', 'scope2']);
    expect(result).toHaveLength(1);
    const info = result[0];
    // Property should be scoped: "scope1.scope2.fieldB"
    expect(info.property).toBe('scope1.scope2.fieldB');
    expect(info.constraint).toBe('minLength');
    expect(info.message).toBe('fieldB is too short');
    expect(info.code).toBeUndefined();
  });

  it('returns empty array if no constraints and no children', () => {
    const err = new ValidationError();
    err.property = 'lonely';
    err.constraints = undefined;
    err.children = [];
    const result = getErrorMessages([err], []);
    expect(result).toEqual([]);
  });
});
