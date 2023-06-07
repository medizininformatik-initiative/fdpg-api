interface IValidationErrorInfo {
  constraint: string;
  message: string;
  property: string;
  code?: string;
}

export class ValidationErrorInfo {
  constructor(error: IValidationErrorInfo) {
    this.constraint = error.constraint;
    this.message = error.message;
    this.property = error.property;
    this.code = error.code;
  }

  /**
   * Validation constraint name
   */
  public constraint: string;

  /**
   * Validation constraint message
   */
  public message: string;

  /**
   * Failed property
   */
  public property: string;

  /**
   * Possible coded extra information
   */
  public code?: string;
}
