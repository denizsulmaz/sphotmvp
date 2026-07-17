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
      <p className="text-gray-500 text-sm mb-12">Last updated: June 2026 (v2)</p>

      <div className="space-y-8 text-gray-600 dark:text-zinc-400 leading-relaxed">

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">1. Data Controller</h2>
          <p>SPHOT (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is the data controller for personal information collected through booksphot.com. For privacy inquiries, contact us at <a href="mailto:hi@booksphot.com" className="text-foreground dark:text-white font-semibold underline underline-offset-2">hi@booksphot.com</a>.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">2. Information We Collect</h2>
          <p className="mb-3">We collect the following personal data when you use our platform:</p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li><strong>Account Information:</strong> Email address, full name, and password (hashed) when you register.</li>
            <li><strong>Email Verification:</strong> A temporary one-time code is generated and emailed to confirm your address during sign-up; it is stored hashed and expires after a short period.</li>
            <li><strong>Photographer Application Data:</strong> Location, service categories, portfolio images, social media links, pricing, bio, and languages.</li>
            <li><strong>Booking Data:</strong> Selected time slots, shoot details you provide (location, group size, style, language, notes), booking status, and payment references.</li>
            <li><strong>Chat Messages:</strong> Messages exchanged between users and photographers within our platform.</li>
            <li><strong>Reviews:</strong> Ratings and written reviews you submit after a completed session.</li>
            <li><strong>Reports &amp; Moderation Data:</strong> If you report a conversation, the report and the related booking/messages so our team can review it.</li>
            <li><strong>Usage Data:</strong> Page views, device type, and browsing behavior via Google Analytics (with IP anonymization, and only if you consent to cookies).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">3. Legal Basis for Processing</h2>
          <p className="mb-3">Under GDPR (EU) and KVKK (Turkey), we process your data based on:</p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li><strong>Contractual Necessity:</strong> Processing required to provide our booking services (account management, bookings, messaging).</li>
            <li><strong>Consent:</strong> Analytics cookies are loaded only after your explicit consent via our cookie banner.</li>
            <li><strong>Legitimate Interest:</strong> Platform security, fraud prevention, and service improvement.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">4. How We Use Your Data</h2>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>To create and manage your account.</li>
            <li>To process photographer applications and admin verifications.</li>
            <li>To facilitate bookings and in-platform messaging.</li>
            <li>To verify your email address and send service-related notifications (via Resend).</li>
            <li>To display reviews and to investigate reports for safety and moderation.</li>
            <li>To analyze anonymized usage patterns (with consent) for platform improvements.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">5. Data Retention</h2>
          <ul className="list-disc pl-6 space-y-1.5">
            <li><strong>Account Data:</strong> Retained for the duration of your account plus 30 days after deletion.</li>
            <li><strong>Booking Records:</strong> Retained for 3 years for financial/legal compliance.</li>
            <li><strong>Chat Messages:</strong> Retained for 1 year after the associated booking is completed or cancelled.</li>
            <li><strong>Reviews:</strong> Retained while the photographer profile is active, so other users can see them.</li>
            <li><strong>Reports:</strong> Retained for up to 2 years for safety, audit, and abuse-prevention purposes.</li>
            <li><strong>Verification Codes:</strong> Deleted shortly after they expire or are used.</li>
            <li><strong>Analytics Data:</strong> Google Analytics data retention is set to 14 months.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">6. Your Rights</h2>
          <p className="mb-3">Under GDPR and KVKK, you have the following rights:</p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li><strong>Right of Access:</strong> Request a copy of the personal data we hold about you.</li>
            <li><strong>Right to Rectification:</strong> Request corrections to inaccurate or incomplete data.</li>
            <li><strong>Right to Erasure:</strong> Request deletion of your personal data (&ldquo;right to be forgotten&rdquo;).</li>
            <li><strong>Right to Data Portability:</strong> Receive your data in a machine-readable format.</li>
            <li><strong>Right to Object:</strong> Object to processing based on legitimate interests.</li>
            <li><strong>Right to Withdraw Consent:</strong> Withdraw cookie consent at any time by clearing your browser data.</li>
          </ul>
          <p className="mt-3">To exercise any of these rights, email <a href="mailto:hi@booksphot.com" className="text-foreground dark:text-white font-semibold underline underline-offset-2">hi@booksphot.com</a>. We will respond within 30 days.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">7. Cookies</h2>
          <p>We use cookies for analytics purposes only. Google Analytics cookies are loaded <strong>only after your explicit consent</strong> via our cookie banner. You can change your cookie preferences at any time by clearing your browser storage and revisiting the site. No tracking cookies are set without your consent.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">8. Third-Party Services</h2>
          <p className="mb-3">We use the following third-party services that may process your data:</p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li><strong>Supabase</strong> (Database & Authentication) — <a href="https://supabase.com/privacy" className="underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
            <li><strong>Resend</strong> (Transactional Email) — <a href="https://resend.com/legal/privacy-policy" className="underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
            <li><strong>Google Analytics</strong> (Usage Analytics, with IP anonymization) — <a href="https://policies.google.com/privacy" className="underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
            <li><strong>Vercel</strong> (Hosting) — <a href="https://vercel.com/legal/privacy-policy" className="underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">9. Data Security</h2>
          <p>We implement industry-standard security measures including encrypted data transmission (TLS/HTTPS), hashed passwords, Row-Level Security (RLS) on database operations, and role-based access controls. However, no method of transmission over the Internet is 100% secure.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">10. International Data Transfers</h2>
          <p>Your data may be processed in countries outside your country of residence. We ensure that appropriate safeguards are in place in accordance with GDPR requirements, including Standard Contractual Clauses where applicable.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">11. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. Changes will be reflected on this page with an updated date. Continued use of the platform after changes constitutes acceptance of the new policy.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">12. Contact</h2>
          <p>For any privacy-related inquiries, data access requests, or to exercise your GDPR/KVKK rights, contact us at <a href="mailto:hi@booksphot.com" className="text-foreground dark:text-white font-semibold underline underline-offset-2">hi@booksphot.com</a>.</p>
        </section>
      </div>
    </div>
  );
}
