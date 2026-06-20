import Link from "next/link";
import { ArrowLeft, Heart, Camera, Users, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Community Guidelines",
  description: "How clients and photographers keep SPHOT safe, respectful, and reliable.",
  alternates: { canonical: "/community-guidelines" },
};

export default function CommunityGuidelinesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-foreground dark:hover:text-white font-semibold mb-10 transition-colors text-sm">
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      <h1 className="text-4xl font-black tracking-tight mb-2 dark:text-white">Community Guidelines</h1>
      <p className="text-gray-500 text-sm mb-12">Last updated: June 2026</p>

      <div className="space-y-10 text-gray-600 dark:text-zinc-400 leading-relaxed">
        <section>
          <p>
            SPHOT works because clients and photographers treat each other with respect and honesty.
            These guidelines apply to everyone on the platform and complement our{" "}
            <Link href="/terms" className="text-foreground dark:text-white font-semibold underline underline-offset-2">Terms of Service</Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-foreground dark:text-white font-semibold underline underline-offset-2">Privacy Policy</Link>.
            Breaking them can lead to warnings, suspension, or removal from the platform.
          </p>
        </section>

        {/* Shared principles */}
        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-4 flex items-center gap-2">
            <Heart size={20} className="text-accent" /> For Everyone
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Be respectful.</strong> No harassment, hate speech, discrimination, threats, or sexual harassment.</li>
            <li><strong>Be honest.</strong> Use your real identity. Don&apos;t impersonate others or misrepresent who you are or what you offer.</li>
            <li><strong>Keep it on-platform.</strong> Communicate and arrange sessions through SPHOT chat. This protects both sides and keeps a record if something goes wrong.</li>
            <li><strong>Communicate clearly.</strong> Reply in good time, show up as agreed, and give as much notice as possible if plans change.</li>
            <li><strong>Respect privacy.</strong> Don&apos;t share someone else&apos;s personal information, photos, or messages without consent.</li>
            <li><strong>Nothing illegal.</strong> No illegal activity, unsafe requests, or content involving minors in any inappropriate context.</li>
          </ul>
        </section>

        {/* For clients */}
        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-4 flex items-center gap-2">
            <Users size={20} className="text-accent" /> For Clients
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Share accurate shoot details.</strong> Location, group size, style, and expectations help your photographer prepare.</li>
            <li><strong>Understand the reservation fee.</strong> The 25,000 KRW deposit secures your slot and unlocks chat. It counts toward your shoot; you agree the full price directly with your photographer.</li>
            <li><strong>Cancel responsibly.</strong> If you can&apos;t make it, cancel as early as possible. Reservation fees are refundable up to 48 hours before the session.</li>
            <li><strong>Leave fair reviews.</strong> Review based on your real experience. No fake, retaliatory, or incentivized reviews.</li>
            <li><strong>Respect the photographer&apos;s work.</strong> Don&apos;t pressure photographers into unsafe locations, unpaid extras, or unrealistic timelines.</li>
          </ul>
        </section>

        {/* For photographers */}
        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-4 flex items-center gap-2">
            <Camera size={20} className="text-accent" /> For Photographers
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Represent your work truthfully.</strong> Only upload portfolio images you created and have the rights to. No stolen or misleading samples.</li>
            <li><strong>Keep pricing transparent.</strong> Be clear about your rates and what&apos;s included before the client commits. No surprise or off-platform charges to avoid fees.</li>
            <li><strong>Honor confirmed bookings.</strong> Approve, decline, or reschedule promptly. Don&apos;t no-show. If you must cancel, tell the client as early as possible.</li>
            <li><strong>Be professional on shoots.</strong> Respect boundaries, obtain consent for how images will be used, and deliver within the timeframe you promised.</li>
            <li><strong>Keep your profile current.</strong> Accurate availability, categories, and locations so clients book with confidence.</li>
          </ul>
        </section>

        {/* Reporting */}
        <section>
          <h2 className="text-xl font-bold text-foreground dark:text-white mb-4 flex items-center gap-2">
            <ShieldCheck size={20} className="text-accent" /> Reporting &amp; Enforcement
          </h2>
          <p className="mb-3">
            If a conversation or person violates these guidelines, use the <strong>report</strong> option in the chat. Our team reviews reports and may access the related booking and messages to investigate, as described in our{" "}
            <Link href="/privacy" className="text-foreground dark:text-white font-semibold underline underline-offset-2">Privacy Policy</Link>.
          </p>
          <p>
            Depending on severity, we may issue a warning, hide a listing or review, suspend, or permanently remove an account. Serious or repeated violations are escalated immediately. Questions or appeals:{" "}
            <a href="mailto:hi@booksphot.com" className="text-foreground dark:text-white font-semibold underline underline-offset-2">hi@booksphot.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
