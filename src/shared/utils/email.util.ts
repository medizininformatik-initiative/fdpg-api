// Emails are case-insensitive in practice: Keycloak lowercases them, proposal participants are free text.
export const isSameEmail = (a?: string | null, b?: string | null): boolean =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase();

const MATCHES_NOTHING = /(?!)/;

// Mongo equality value for an email field. ponytail: anchored regex can't use the index for an exact seek,
// switch to a normalized lowercase field if the proposals collection gets large.
export const emailMatcher = (email?: string | null): RegExp =>
  email ? new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') : MATCHES_NOTHING;
