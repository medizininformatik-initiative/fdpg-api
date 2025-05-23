const migration0Up = jest.fn();
const migration7Up = jest.fn();
const migration8Up = jest.fn();

export const Migration000 = jest.fn().mockImplementation(() => ({
  up: migration0Up,
}));

export const Migration007 = jest.fn().mockImplementation(() => ({
  up: migration7Up,
}));

export const Migration008 = jest.fn().mockImplementation(() => ({
  up: migration8Up,
}));
