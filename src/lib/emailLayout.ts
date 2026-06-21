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

        <!-- Header brand bar (compact) -->
        <tr>
          <td align="center" style="background:#000000;padding:18px 24px;">
            <img src="${BRAND.emailLogoUrl}" alt="${BRAND.name}" width="76" height="76"
                 style="display:block;width:76px;height:76px;border-radius:14px;object-fit:contain;" />
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td align="center" style="padding:36px 32px 28px;text-align:center;color:#111111;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- Footer: social icons + HQ (no duplicate wordmark) -->
        <tr>
          <td align="center" style="background:#000000;padding:24px;text-align:center;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 14px;">
              <tr>
                <td style="padding:0 8px;">
                  <a href="${BRAND.socials.instagram}" style="text-decoration:none;">
                    <img src="${BRAND.emailIcons.instagram}" alt="Instagram" width="22" height="22" style="display:block;width:22px;height:22px;" />
                  </a>
                </td>
                <td style="padding:0 8px;">
                  <a href="${BRAND.socials.tiktok}" style="text-decoration:none;">
                    <img src="${BRAND.emailIcons.tiktok}" alt="TikTok" width="22" height="22" style="display:block;width:22px;height:22px;" />
                  </a>
                </td>
              </tr>
            </table>
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
