import { BRAND } from "@/lib/brand";

/**
 * Wraps email body content in the branded SPHOT shell:
 *  - black header bar with the centered logo
 *  - white content card (centered, designed)
 *  - evergreen footer with social handles + HQ
 *
 * Uses table-based, inline-styled, email-client-safe HTML. All content centered.
 */
export function brandedEmail(opts: {
  /** Inner content HTML (already centered/styled blocks). */
  bodyHtml: string;
  /** Optional preheader (inbox preview text). */
  preheader?: string;
}): string {
  const { bodyHtml, preheader = "" } = opts;
  const accent = BRAND.colors.accent; // #fffa6c
  const year = "2026";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${BRAND.name}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">

        <!-- Header brand bar -->
        <tr>
          <td align="center" style="background:#000000;padding:28px 24px;">
            <img src="${BRAND.emailLogoUrl}" alt="${BRAND.name}" width="120" height="120"
                 style="display:block;width:120px;height:120px;border-radius:16px;object-fit:contain;" />
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td align="center" style="padding:36px 32px 28px;text-align:center;color:#111111;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="background:#000000;padding:28px 24px;text-align:center;">
            <p style="margin:0 0 10px;color:#ffffff;font-size:14px;font-weight:800;letter-spacing:2px;">
              ${BRAND.name}<span style="color:${accent};">.</span>
            </p>
            <p style="margin:0 0 14px;">
              <a href="${BRAND.socials.instagram}" style="color:#a1a1aa;text-decoration:none;font-size:12px;font-weight:600;margin:0 8px;">Instagram @booksphot</a>
              <a href="${BRAND.socials.tiktok}" style="color:#a1a1aa;text-decoration:none;font-size:12px;font-weight:600;margin:0 8px;">TikTok @booksphot</a>
            </p>
            <p style="margin:0;color:#71717a;font-size:11px;line-height:1.6;">
              ${BRAND.hq}<br/>
              &copy; ${year} ${BRAND.name}. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
