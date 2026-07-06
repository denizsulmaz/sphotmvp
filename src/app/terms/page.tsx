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
          <p>SPHOT is a free connection directory and chat portal that connects users with independent photographers in Seoul. We let users browse photographers, confirm an availability slot, and communicate directly in-platform. SPHOT is not a photographer, does not itself provide photography services, and is not an agency; photographers are completely independent providers.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">3. Accounts &amp; Eligibility</h2>
          <p className="mb-3">You must be at least 18 years old (or have legal guardian consent) to create an account. You agree to provide accurate information and to keep your credentials secure. We verify email addresses via a one-time code. You are responsible for all activity under your account.</p>
          <p>Photographer accounts must be reviewed and approved by our team before becoming publicly visible. We aim to review applications within 3 business days. We may decline or remove a listing at our discretion.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">4. Free Booking &amp; Payments</h2>
          <p className="mb-3">Booking slots and connecting with photographers on SPHOT is entirely free of charge. SPHOT does not charge any platform fees, commission fees, or reservation deposits.</p>
          <p className="mb-3">All financial arrangements, pricing, session deliverables, and final balances are agreed upon and settled <strong>directly between the user and the photographer</strong> off-platform. SPHOT is not a party to, nor is it responsible for, any financial transactions, payment collections, or pricing agreements made between users and photographers.</p>
          <p>Any cancellation, rescheduling, or refund disputes must be resolved directly between the user and the photographer according to their individual agreements.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">5. Bookings, Cancellations &amp; Conduct</h2>
          <p className="mb-3">A confirmed reservation is a request to a photographer, who may approve, decline, or, by mutual agreement, reschedule it. Both parties agree to communicate respectfully and in good faith through the in-platform chat.</p>
          <p>To protect both sides, all booking-related communication and arrangements should take place on the Platform. Soliciting payment off-platform to avoid fees, harassment, no-shows, and misrepresentation are prohibited and may result in suspension. See our <Link href="/community-guidelines" className="text-foreground dark:text-white font-semibold underline underline-offset-2">Community Guidelines</Link>.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">6. Reviews</h2>
          <p>After a completed session, users may leave a rating and written review. Reviews must be honest, relevant, and respectful. We may remove reviews that violate our guidelines, contain personal data, or are fraudulent.</p>
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
          <p className="mb-3">Photographer listings and portfolios are presented for informational purposes only. We do not verify, guarantee, or take responsibility for the quality, safety, legality, timing, or outcome of any session, nor the truth or accuracy of photographer portfolios.</p>
          <p>To the maximum extent permitted by law, SPHOT holds zero liability and bears no responsibility for any disputes, service failures, financial transactions, cancellations, losses, personal injuries, or damages of any kind arising from sessions, scheduling, agreements, or interactions between users and photographers. Users and photographers connect and transact entirely at their own risk.</p>
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
