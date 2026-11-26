import { emailMatcher, isSameEmail } from '../email.util';

describe('isSameEmail', () => {
  it('ignores case', () => expect(isSameEmail('Maher.Gammoudi@uni.de', 'maher.gammoudi@uni.de')).toBe(true));
  it('rejects different emails', () => expect(isSameEmail('a@uni.de', 'b@uni.de')).toBe(false));
  it('rejects missing emails', () => {
    expect(isSameEmail(undefined, undefined)).toBe(false);
    expect(isSameEmail('', '')).toBe(false);
  });
});

describe('emailMatcher', () => {
  it('matches case-insensitively and exactly', () => {
    const m = emailMatcher('maher.gammoudi@uni.de');
    expect(m.test('Maher.Gammoudi@uni.de')).toBe(true);
    expect(m.test('xmaher.gammoudi@uni.de')).toBe(false);
    expect(m.test('maher.gammoudi@uni.de.evil')).toBe(false);
  });
  it('escapes regex characters (no wildcard dot, no plus)', () => {
    expect(emailMatcher('a.b+c@uni.de').test('aXb+c@uni.de')).toBe(false);
    expect(emailMatcher('a.b+c@uni.de').test('A.B+C@uni.de')).toBe(true);
  });
  it('matches nothing without an email, not even empty strings', () => {
    expect(emailMatcher(undefined).test('')).toBe(false);
    expect(emailMatcher('').test('')).toBe(false);
  });
});
