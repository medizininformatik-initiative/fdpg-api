const migration0Up = jest.fn();

const migration1Up = jest.fn();
const migration1Down = jest.fn();

const migration2Up = jest.fn();
const migration2Down = jest.fn();

const migration3Up = jest.fn();
const migration3Down = jest.fn();

const migrationGeneralUp = jest.fn();
const migrationGeneralDown = jest.fn();

export const Migration000 = jest.fn().mockImplementation(() => ({
  up: migration0Up,
}));

export const Migration001 = jest.fn().mockImplementation(() => ({
  up: migration1Up,
  down: migration1Down,
}));

export const Migration002 = jest.fn().mockImplementation(() => ({
  up: migration2Up,
  down: migration2Down,
}));

export const Migration003 = jest.fn().mockImplementation(() => ({
  up: migration3Up,
  down: migration3Down,
}));

export const Migration004 = jest.fn().mockImplementation(() => ({
  up: migrationGeneralUp,
  down: migrationGeneralDown,
}));

export const Migration005 = jest.fn().mockImplementation(() => ({
  up: migrationGeneralUp,
  down: migrationGeneralDown,
}));

export const Migration006 = jest.fn().mockImplementation(() => ({
  up: migrationGeneralUp,
  down: migrationGeneralDown,
}));
