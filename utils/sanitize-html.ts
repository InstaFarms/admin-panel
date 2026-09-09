import "server-only";

/**
 * Server-side sanitizer for the admin panel's rich-text fields.
 *
 * These values are written by admins and rendered with dangerouslySetInnerHTML
 * on the public Instafarms and Mago sites, so whatever is stored runs in a
 * visitor's browser. Sanitizing on save (rather than on render) means the
 * ~2,200 rows already in the database and every public renderer stay untouched.
 *
 * This is an allowlist: an unknown tag loses its markup but keeps its text, and
 * an unknown attribute is dropped. Blocklists get bypassed; allowlists fail closed.
 *
 * ponytail: hand-rolled because adding a dependency needs sign-off. It is strict
 * enough for admin-authored content, but a real HTML parser (isomorphic-dompurify)
 * is the upgrade if this ever accepts input from a less trusted source.
 */

const ALLOWED_TAGS = new Set([
  "p", "br", "hr", "div", "span",
  "b", "strong", "i", "em", "u", "s", "strike", "del", "ins", "mark", "sub", "sup", "small",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "dl", "dt", "dd",
  "a", "img", "figure", "figcaption",
  "blockquote", "pre", "code",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
]);

// Attributes safe on any allowed tag.
const GLOBAL_ATTRS = new Set(["style", "class", "title", "dir", "lang"]);

const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel", "name"]),
  img: new Set(["src", "alt", "width", "height", "loading"]),
  td: new Set(["colspan", "rowspan", "align", "valign"]),
  th: new Set(["colspan", "rowspan", "align", "valign", "scope"]),
  col: new Set(["span", "width"]),
  colgroup: new Set(["span"]),
  table: new Set(["border", "cellpadding", "cellspacing", "width", "align"]),
  ol: new Set(["start", "type"]),
};

// Tags whose *contents* are dropped too, not just their markup.
const STRIP_WITH_CONTENT = /<\s*(script|style|iframe|object|embed|noscript|template|svg|math|form|input|button|select|textarea|link|meta|base)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const STRIP_SELF_CLOSING = /<\s*(script|style|iframe|object|embed|noscript|template|svg|math|form|input|button|select|textarea|link|meta|base)\b[^>]*\/?>/gi;

const VOID_TAGS = new Set(["br", "hr", "img", "col"]);

/** Blocks javascript:, vbscript:, data: (except inline images) and control-char smuggling. */
function isSafeUrl(rawValue: string): boolean {
  const value = rawValue
    .replace(/[\u0000-\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/g, "")
    .toLowerCase();

  if (/^(javascript|vbscript|data|blob|file):/.test(value)) {
    // Inline images are the one data: URI worth keeping; they cannot execute.
    return /^data:image\/(png|jpe?g|gif|webp|avif);base64,/.test(value);
  }
  return true;
}

/** Drops CSS that can execute or phone out (expression(), url(javascript:), @import). */
function sanitizeStyle(value: string): string {
  if (/expression\s*\(|javascript:|vbscript:|@import|behaviou?r\s*:|-moz-binding/i.test(value)) {
    return "";
  }
  return value;
}

function sanitizeAttributes(tag: string, attrSource: string): string {
  const allowed = TAG_ATTRS[tag];
  const out: string[] = [];
  // name="value" | name='value' | name=value | name
  const attrPattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;

  let match: RegExpExecArray | null;
  while ((match = attrPattern.exec(attrSource)) !== null) {
    const name = match[1].toLowerCase();
    let value = match[2] ?? "";
    if (value.startsWith('"') || value.startsWith("'")) value = value.slice(1, -1);

    // Every on* handler, plus anything not explicitly allowed for this tag.
    if (name.startsWith("on")) continue;
    if (!GLOBAL_ATTRS.has(name) && !allowed?.has(name)) continue;

    if (name === "href" || name === "src") {
      if (!isSafeUrl(value)) continue;
    }
    if (name === "style") {
      value = sanitizeStyle(value);
      if (!value) continue;
    }

    out.push(`${name}="${value.replace(/"/g, "&quot;")}"`);
  }

  // Anchors that open a new tab must not hand the opener over to the target page.
  if (tag === "a" && /target="_blank"/i.test(out.join(" ")) && !out.some((a) => a.startsWith("rel="))) {
    out.push('rel="noopener noreferrer"');
  }

  return out.length ? " " + out.join(" ") : "";
}

/**
 * Returns the value with unsafe markup removed. Text content is always preserved.
 * Null/undefined/empty in, empty string out.
 */
export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return "";

  let html = input;
  let previous: string;
  // Re-run until stable: nested constructs like <scr<script>ipt> collapse into a
  // live tag after a single pass.
  do {
    previous = html;
    html = html.replace(STRIP_WITH_CONTENT, "").replace(STRIP_SELF_CLOSING, "");
  } while (html !== previous);

  // Comments can hide markup from the naive reader and carry IE conditionals.
  html = html.replace(/<!--[\s\S]*?-->/g, "");

  return html.replace(
    /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g,
    (_full, closing: string, rawTag: string, attrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";
      if (closing) return VOID_TAGS.has(tag) ? "" : `</${tag}>`;
      const safeAttrs = sanitizeAttributes(tag, attrs);
      return VOID_TAGS.has(tag) ? `<${tag}${safeAttrs} />` : `<${tag}${safeAttrs}>`;
    }
  );
}

/**
 * Field names that hold admin-authored HTML anywhere in the app's payloads.
 * Keep this list in step with the fields backed by <HtmlField>.
 */
export const HTML_FIELD_KEYS = [
  "answer",
  "description",
  "content",
  "bookingPolicy",
  "booking_policy",
  "homeRulesAndTruth",
  "pageDescription",
  "descriptionOverride",
] as const;

/**
 * Walks a payload (object, array, or JSON-ish tree) and sanitizes every string
 * sitting under an HTML field name, leaving everything else untouched.
 *
 * One call per server action beats hand-sanitizing each field, because these
 * payloads nest: FAQs and info sections arrive as arrays of objects.
 */
export function sanitizeHtmlFields<T>(value: T, keys: readonly string[] = HTML_FIELD_KEYS): T {
  const htmlKeys = new Set(keys);

  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(node as Record<string, unknown>)) {
        out[key] =
          typeof val === "string" && htmlKeys.has(key) ? sanitizeHtml(val) : walk(val);
      }
      return out;
    }
    return node;
  };

  return walk(value) as T;
}
