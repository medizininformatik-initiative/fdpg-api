// allowed chars
const ALLOWED = `[\\wÀ-ž&\\\\#/*?.:+\\-|@]`;

// One or more allowed chars, then zero or more groups of:
// single space + one or more allowed chars
export const PROPOSAL_SHORTCUT_REGEX = new RegExp(`^${ALLOWED}+(?:\\s${ALLOWED}+)*$`);
