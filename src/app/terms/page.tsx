import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-foreground dark:hover:text-white font-semibold mb-10 transition-colors text-sm">
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      <h1 className="text-4xl font-black tracking-tight mb-2 dark:text-white">Terms of Service</h1>
      <p className="text-gray-500 text-sm mb-12">Last updated: June 2026</p>

      <div className="space-y-8 text-gray-600 dark:text-zinc-400 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">1. Acceptance of Terms</h2>
          <p>By accessing or using SPHOT (&quot;the Platform&quot;, &quot;we&quot;, &quot;us&quot;), available at booksphot.com, you agree to be bound by these Terms of Service and our <Link href="/privacy" className="text-foreground dark:text-white font-semibold underline underline-offset-2">Privacy Policy</Link> and <Link href="/community-guidelines" className="text-foreground dark:text-white font-semibold underline underline-offset-2">Community Guidelines</Link>. If you do not agree, do not use the Platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">2. What SPHOT Is</h2>
          <p>SPHOT is a booking marketplace that connects clients with independent photographers in Seoul. We let clients browse photographers, securely reserve a session with a platform reservation fee, and communicate in-platform after a reservation is confirmed. SPHOT is not the photographer and does not itself provide photography services; photographers are independent service providers.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">3. Accounts &amp; Eligibility</h2>
          <p className="mb-3">You must be at least 18 years old (or have legal guardian consent) to create an account. You agree to provide accurate information and to keep your credentials secure. We verify email addresses via a one-time code. You are responsible for all activity under your account.</p>
          <p>Photographer accounts must be reviewed and approved by our team before becoming publicly visible. We aim to review applications within 3 business days. We may decline or remove a listing at our discretion.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">4. Reservation Fee &amp; Payments</h2>
          <p className="mb-3">To secure a booking, the client pays a flat <strong>reservation fee of 25,000 KRW</strong> to SPHOT through our payment processor (Lemon Squeezy). This fee reserves the selected time slot and unlocks direct in-platform chat with the photographer.</p>
          <p className="mb-3">The reservation fee is a <strong>deposit that counts toward the total cost of the shoot</strong>. The remaining balance and the final scope and price of the session are agreed <strong>directly between the client and the photographer</strong> and settled between them. SPHOT is not a party to that settlement and does not process the balance.</p>
          <p>The reservation fee is fully refundable if the booking is cancelled at least <strong>48 hours before</strong> the scheduled session. Cancellations within 48 hours of the session may not be refundable. Refunds are issued to the original payment method.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">5. Bookings, Cancellations &amp; Conduct</h2>
          <p className="mb-3">A confirmed reservation is a request to a photographer, who may approve, decline, or, by mutual agreement, reschedule it. Both parties agree to communicate respectfully and in good faith through the in-platform chat.</p>
          <p>To protect both sides, all booking-related communication and arrangements should take place on the Platform. Soliciting payment off-platform to avoid fees, harassment, no-shows, and misrepresentation are prohibited and may result in suspension. See our <Link href="/community-guidelines" className="text-foreground dark:text-white font-semibold underline underline-offset-2">Community Guidelines</Link>.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">6. Reviews</h2>
          <p>After a completed session, clients may leave a rating and written review. Reviews must be honest, relevant, and respectful. We may remove reviews that violate our guidelines, contain personal data, or are fraudulent.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">7. Content &amp; Intellectual Property</h2>
          <p className="mb-3">Photographers retain ownership of their portfolio images and grant SPHOT a non-exclusive license to display them on the Platform for promotional and listing purposes. You confirm you have the rights to any content you upload.</p>
          <p>The SPHOT name, design, and branding belong to SPHOT. You may not reproduce or use Platform content without permission.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">8. Moderation &amp; Reporting</h2>
          <p>Users can report conversations or behavior that violate these Terms. To investigate reports and ensure safety, our administrators may review booking and message data as described in our <Link href="/privacy" className="text-foreground dark:text-white font-semibold underline underline-offset-2">Privacy Policy</Link>. We may warn, suspend, or remove accounts that breach these Terms or our Community Guidelines.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">9. Disclaimers &amp; Limitation of Liability</h2>
          <p className="mb-3">Photographer listings and portfolios are presented in good faith but we cannot guarantee their accuracy, quality, or the outcome of any session. Clients and photographers contract directly with one another for the shoot itself.</p>
          <p>To the maximum extent permitted by law, SPHOT is not liable for disputes, damages, or losses arising from sessions, agreements, or interactions between clients and photographers, beyond the reservation fee paid to us for the relevant booking.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">10. Changes to These Terms</h2>
          <p>We may update these Terms from time to time. Material changes will be reflected here with a new date. Continued use of the Platform after changes constitutes acceptance.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">11. Contact</h2>
          <p>For questions about these terms, contact us at <a href="mailto:hi@booksphot.com" className="text-foreground dark:text-white font-semibold underline underline-offset-2">hi@booksphot.com</a>.</p>
        </section>
      </div>
    </div>
  );
}
