// https://github.com/jest-community/eslint-plugin-jest/blob/v25.3.4/docs/rules/no-conditional-expect.md

export class NoErrorThrownError extends Error {}

export const getError = async <TError>(call: () => unknown): Promise<TError> => {
  try {
    await call()

    throw new NoErrorThrownError()
  } catch (error: unknown) {
    return error as TError
  }
}
