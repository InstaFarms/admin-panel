/**
 * Helpers for the rich-text (HTML) fields in the admin panel.
 *
 * Rich-text values are never plain strings, so `value.trim()` is not a usable
 * "did the admin type anything?" test: an empty Jodit field still submits
 * markup like `<p><br></p>`. Use `isHtmlBlank` for every required-field check
 * on a field backed by HtmlField.
 */

/** Strips tags and entities so HTML can be length-checked or previewed as text. */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when a rich-text value has no visible content, whatever markup it carries. */
export function isHtmlBlank(html: string | null | undefined): boolean {
  if (!html) return true;
  // Media carries meaning even with no text around it.
  if (/<(img|iframe|video|table|hr)[\s>/]/i.test(html)) return false;
  return htmlToPlainText(html).length === 0;
}
