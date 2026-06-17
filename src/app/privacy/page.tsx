import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-foreground font-semibold mb-10 transition-colors text-sm">
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      <h1 className="text-4xl font-black tracking-tight mb-2">Privacy Policy</h1>
      <p className="text-gray-500 text-sm mb-12">Last updated: March 2025</p>

      <div className="space-y-8 text-gray-600 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-foreground mb-2">1. Information We Collect</h2>
          <p>SPHOT is a static discovery platform. We do not currently collect personal data directly through the site. When you use the WhatsApp booking link, your communication is handled through WhatsApp&apos;s own platform and privacy policy applies to those interactions.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-2">2. Analytics</h2>
          <p>We may use privacy-first analytics tools to understand aggregate site traffic (e.g., page views, geographic data). No personally identifiable information is collected through analytics.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-2">3. Third-Party Links</h2>
          <p>Our platform contains links to third-party services including Instagram, TikTok, and WhatsApp. SPHOT is not responsible for the privacy practices of these third parties. We encourage you to read their privacy policies independently.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-2">4. Photographer Data</h2>
          <p>Photographer profiles are published with the consent of the photographers listed. Portfolio images are used with permission. If you are a listed photographer and wish to update or remove your information, contact us at the address below.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-2">5. Data Security</h2>
          <p>As a static website with no server-side database, SPHOT does not store any user data on its servers. Your privacy is inherently protected by the nature of our platform architecture.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-2">6. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. Changes will be reflected on this page with an updated date. Continued use of the platform after changes constitutes acceptance of the new policy.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-2">7. Contact</h2>
          <p>For any privacy-related inquiries, contact us at <a href="mailto:hi@booksphot.com" className="text-foreground font-semibold underline underline-offset-2">hi@booksphot.com</a>.</p>
        </section>
      </div>
    </div>
  );
}
