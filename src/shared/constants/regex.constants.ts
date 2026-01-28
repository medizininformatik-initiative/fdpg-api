const wordsAndChars = '[\\wÀ-ž\\&\\\\#\\/*\\?\\.\\:\\+\\-\\|\\@]';
const singleWhiteSpace = '(\\s)?';
/**
 * Regex should find words and following special character:
 * Single space &/\?.:#*+-_|@
 * https://appsfactory.atlassian.net/browse/ZARS-155
 */

const wordsAndSpace = `(${wordsAndChars}*${singleWhiteSpace}${wordsAndChars}+)`;
export const PROPOSAL_SHORTCUT_REGEX = new RegExp(`^(${wordsAndChars}+${wordsAndSpace}*)$`);
