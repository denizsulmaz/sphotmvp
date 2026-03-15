import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-foreground font-semibold mb-10 transition-colors text-sm">
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      <h1 className="text-4xl font-black tracking-tight mb-2">Terms of Service</h1>
      <p className="text-gray-500 text-sm mb-12">Last updated: March 2025</p>

      <div className="space-y-8 text-gray-600 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-foreground mb-2">1. Acceptance of Terms</h2>
          <p>By accessing or using SPHOT ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-2">2. Description of Service</h2>
          <p>SPHOT is a discovery platform that connects clients with independent photographers in Seoul. SPHOT acts as a marketplace and is not a party to any agreements made between clients and photographers. All bookings, payments, and service agreements are made directly between the client and the photographer.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-2">3. User Responsibilities</h2>
          <p>You agree to use the Platform only for lawful purposes. You are responsible for all communications and agreements you make with photographers discovered through SPHOT. You must not misrepresent your identity or intentions when contacting photographers.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-2">4. Photographer Listings</h2>
          <p>SPHOT presents photographer profiles and portfolio content in good faith. While we strive to verify information, we cannot guarantee the accuracy, completeness, or quality of any listing. Clients should conduct their own due diligence before making a booking.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-2">5. Intellectual Property</h2>
          <p>All content on the Platform — including design, branding, and text — belongs to SPHOT. Photographer portfolio images remain the property of their respective owners. You may not reproduce, distribute, or use any content without explicit permission.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-2">6. Limitation of Liability</h2>
          <p>SPHOT is not liable for any disputes, damages, or losses arising from sessions booked through the Platform. By using SPHOT, you acknowledge that all agreements are directly between you and the photographer.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-2">7. Contact</h2>
          <p>For questions about these terms, contact us at <a href="mailto:hi@booksphot.com" className="text-foreground font-semibold underline underline-offset-2">hi@booksphot.com</a>.</p>
        </section>
      </div>
    </div>
  );
}
