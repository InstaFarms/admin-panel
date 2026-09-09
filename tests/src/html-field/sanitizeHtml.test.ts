import { describe, expect, it } from "vitest";

import { mockServerModules } from "../../mocks/serverMocks";

mockServerModules();

const { sanitizeHtml } = await import("@/utils/sanitize-html");

describe("sanitizeHtml", () => {
  it("keeps the formatting admins actually use", () => {
    const input =
      '<p>Browse the <strong>Newly Launched</strong> collection.<br>' +
      '<a href="https://instafarms.in/book">Book now</a></p>' +
      "<ul><li>One</li><li>Two</li></ul>";
    expect(sanitizeHtml(input)).toContain("<strong>");
    expect(sanitizeHtml(input)).toContain('<a href="https://instafarms.in/book">');
    expect(sanitizeHtml(input)).toContain("<li>One</li>");
  });

  it("keeps inline styles and tables from pasted Word/Docs content", () => {
    const input = '<p style="color: rgb(3, 3, 3);">Hi</p><table><tr><td colspan="2">x</td></tr></table>';
    const out = sanitizeHtml(input);
    expect(out).toContain('style="color: rgb(3, 3, 3);"');
    expect(out).toContain('colspan="2"');
  });

  describe("blocks execution", () => {
    const attacks: [string, string][] = [
      ["script tag", '<p>hi</p><script>alert(1)</script>'],
      ["nested script", '<scr<script>ipt>alert(1)</script>'],
      ["onerror handler", '<img src="x" onerror="alert(1)">'],
      ["onclick handler", '<p onclick="alert(1)">hi</p>'],
      ["uppercase handler", '<P ONCLICK="alert(1)">hi</P>'],
      ["javascript href", '<a href="javascript:alert(1)">click</a>'],
      ["javascript href with tab", '<a href="java\tscript:alert(1)">click</a>'],
      ["iframe", '<iframe src="https://evil.test"></iframe>'],
      ["style expression", '<p style="width: expression(alert(1))">hi</p>'],
      ["svg payload", '<svg><animate onbegin="alert(1)" /></svg>'],
      ["form hijack", '<form action="https://evil.test"><input name="a"></form>'],
      ["data uri html", '<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>'],
      ["comment smuggling", '<!--<img src=x onerror=alert(1)>-->'],
      ["meta refresh", '<meta http-equiv="refresh" content="0;url=https://evil.test">'],
    ];

    it.each(attacks)("neutralises %s", (_name, payload) => {
      const out = sanitizeHtml(payload).toLowerCase();
      expect(out).not.toContain("<script");
      expect(out).not.toContain("onerror");
      expect(out).not.toContain("onclick");
      expect(out).not.toContain("onbegin");
      expect(out).not.toContain("javascript:");
      expect(out).not.toContain("<iframe");
      expect(out).not.toContain("<svg");
      expect(out).not.toContain("<form");
      expect(out).not.toContain("<meta");
      expect(out).not.toContain("expression(");
      expect(out).not.toContain("data:text/html");
    });
  });

  it("keeps base64 inline images, which cannot execute", () => {
    const png = "data:image/png;base64,iVBORw0KGgo=";
    expect(sanitizeHtml(`<img src="${png}">`)).toContain(png);
  });

  it("adds rel=noopener to target=_blank links", () => {
    const out = sanitizeHtml('<a href="https://x.test" target="_blank">x</a>');
    expect(out).toContain("noopener");
  });

  it("keeps the text of a disallowed tag instead of deleting the sentence", () => {
    expect(sanitizeHtml("<marquee>Important notice</marquee>")).toBe("Important notice");
  });

  it("returns empty string for nullish input", () => {
    expect(sanitizeHtml(null)).toBe("");
    expect(sanitizeHtml(undefined)).toBe("");
    expect(sanitizeHtml("")).toBe("");
  });
});
