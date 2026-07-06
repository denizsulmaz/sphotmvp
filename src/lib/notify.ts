/**
 * Helper to send email alerts to hi@booksphot.com using Resend.
 * Falls back to logging in development when RESEND_API_KEY is absent.
 */
export async function sendNotificationEmail(
  subject: string,
  htmlContent: string,
  textContent: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || '"SPHOT Team" <alerts@email.booksphot.com>';
  const to = "hi@booksphot.com";

  if (!apiKey) {
    console.warn(`[Notification Alert][dev] No RESEND_API_KEY — alert would be:`);
    console.warn(`Subject: ${subject}`);
    console.warn(`Content: ${textContent}`);
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html: htmlContent,
        text: textContent,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[Notification Alert] Resend failed (${res.status}): ${body}`);
      return false;
    }
    return true;
  } catch (e: any) {
    console.error(`[Notification Alert] Failed to fetch Resend:`, e?.message);
    return false;
  }
}
