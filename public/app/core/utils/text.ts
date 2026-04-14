
/**
 * Adapt findMatchesInText for react-highlight-words findChunks handler.
 * See https://github.com/bvaughn/react-highlight-words#props
 */
export function findHighlightChunksInText({ searchWords, textToHighlight }) {
  return findMatchesInText(textToHighlight, searchWords.join(' '));
}

/**
 * Returns a list of substring regexp matches.
 */
export function findMatchesInText(haystack: string, needle: string): any[] {
  // Empty search can send re.exec() into infinite loop, exit early
  if (!haystack || !needle) {
    return [];
  }
  const regexp = new RegExp(`(?:${needle})`, 'g');
  const matches = [];
  let match = regexp.exec(haystack);
  while (match) {
    matches.push({
      text: match[0],
      start: match.index,
      length: match[0].length,
      end: match.index + match[0].length,
    });
    match = regexp.exec(haystack);
  }
  return matches;
}

const invalidProtocolRegex = /^([^\w]*)(javascript|data|vbscript)/im;
const ctrlCharactersRegex =
  /[\u0000-\u001F\u007F-\u009F\u2000-\u200D\uFEFF]/gim;
const urlSchemeRegex = /^([^:]+):/gm;
const relativeFirstCharacters = [".", "/"];

function isRelativeUrlWithoutProtocol(url: string): boolean {
  return relativeFirstCharacters.indexOf(url[0]) > -1;
}


/**
 * sanitize-url
 *
 * @version v5.0.2 - 2021-06-02
 * @link https://github.com/braintree/sanitize-url
 * @author braintree
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */
export function sanitizeUrl(url?: string): string {
  if (!url) {
    return "about:blank";
  }

  const sanitizedUrl = url.replace(ctrlCharactersRegex, "").trim();

  if (isRelativeUrlWithoutProtocol(sanitizedUrl)) {
    return sanitizedUrl;
  }

  const urlSchemeParseResults = sanitizedUrl.match(urlSchemeRegex);

  if (!urlSchemeParseResults) {
    return sanitizedUrl;
  }

  const urlScheme = urlSchemeParseResults[0];

  if (invalidProtocolRegex.test(urlScheme)) {
    return "about:blank";
  }

  return sanitizedUrl;
}

export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
