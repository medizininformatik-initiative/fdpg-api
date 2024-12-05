import { Expose, ExposeOptions, Transform } from 'class-transformer';

// https://github.com/typestack/class-transformer/issues/494
export const ExposeId = (options?: ExposeOptions) => (target: object, propertyKey: string) => {
  Expose(options)(target, propertyKey);
  Transform(({ obj }) => {
    return obj[propertyKey];
  })(target, propertyKey);
};
