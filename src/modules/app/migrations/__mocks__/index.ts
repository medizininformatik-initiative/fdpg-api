const migration0Up = jest.fn();

export const Migration000 = jest.fn().mockImplementation(() => ({
  up: migration0Up,
}));
