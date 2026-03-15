import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="w-full">
      {/* Dark Header & Founder Section */}
      <div className="bg-black text-white w-full pt-6 md:pt-12 pb-16 md:pb-24">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white font-semibold mb-12 transition-colors text-sm">
            <ArrowLeft size={16} />
            Back to Home
          </Link>

          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">About <span className="text-accent">SPHOT</span></h1>
          <p className="text-gray-400 text-lg md:text-xl mb-16">The story behind your favourite photographer discovery platform.</p>

          {/* Founder Story */}
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <div className="w-full md:w-5/12 flex-shrink-0">
              <div className="relative aspect-square md:aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl bg-gray-900 border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/irina.png`}
                  alt="Irina - Founder of SPHOT" 
                  className="absolute inset-0 w-full h-full object-cover object-center"
                />
              </div>
            </div>
            <div className="w-full md:w-7/12 flex flex-col justify-center">
              <h2 className="text-3xl font-bold mb-5 text-white">Meet the Founder</h2>
              <p className="text-gray-300 leading-relaxed text-lg mb-4">
                Hi, I'm Irina! When I moved to Seoul, I realized how incredibly hard it was to find the right photographer, whether for a personal portrait, a love story, or a professional branding shoot. Endlessly scrolling through social media, translating messages, and comparing prices felt overwhelming.
              </p>
              <p className="text-gray-300 leading-relaxed text-lg">
                I created SPHOT to solve this exact problem: an easy, transparent way to connect people who want beautiful photos with the talented, vetted photographers who capture them brilliantly.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Light Content Section */}
      <div className="bg-white text-foreground w-full py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <div className="prose prose-gray max-w-none space-y-12">
            <section>
              <h2 className="text-3xl font-bold mb-4">What is SPHOT?</h2>
              <p className="text-gray-600 leading-relaxed text-lg">
                SPHOT is a curated marketplace that connects people with talented, vetted photographers across Seoul. Whether you need a portrait session, a couple shoot at sunset, a business branding session, or event coverage, SPHOT makes it effortless to discover, compare, and book the right photographer for your moment.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
              <p className="text-gray-600 leading-relaxed text-lg">
                We believe every moment deserves to be captured beautifully. Our mission is to make professional photography accessible and uncomplicated for everyone, whether you are a tourist wanting memory-making shots in Seoul, a couple looking for a love story shoot, or a brand building its visual identity.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-bold mb-6">How It Works</h2>
              <ol className="space-y-6 text-gray-600 text-lg">
                <li className="flex gap-5 items-start">
                  <span className="flex-shrink-0 w-10 h-10 mt-1 rounded-full bg-accent flex items-center justify-center font-black text-black">1</span>
                  <div className="pt-2"><strong className="text-foreground">Browse</strong> Explore photographers by category, style, and availability.</div>
                </li>
                <li className="flex gap-5 items-start">
                  <span className="flex-shrink-0 w-10 h-10 mt-1 rounded-full bg-accent flex items-center justify-center font-black text-black">2</span>
                  <div className="pt-2"><strong className="text-foreground">Choose</strong> Review their portfolio, pricing, and response speed.</div>
                </li>
                <li className="flex gap-5 items-start">
                  <span className="flex-shrink-0 w-10 h-10 mt-1 rounded-full bg-accent flex items-center justify-center font-black text-black">3</span>
                  <div className="pt-2"><strong className="text-foreground">Book</strong> Connect instantly via WhatsApp to confirm your session.</div>
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-3xl font-bold mb-4">Get in Touch</h2>
              <p className="text-gray-600 leading-relaxed text-lg">
                Have a question, partnership inquiry, or just want to say hello? Reach us at{" "}
                <a href="mailto:hi@booksphot.com" className="text-foreground font-bold underline underline-offset-4 hover:text-accent transition-colors">
                  hi@booksphot.com
                </a>.
                <br /><br />
                Follow our journey on{" "}
                <a href="https://instagram.com/booksphot" target="_blank" rel="noopener noreferrer" className="text-foreground font-bold underline underline-offset-4 hover:text-accent transition-colors">Instagram</a>{" "}
                and{" "}
                <a href="https://tiktok.com/@booksphot" target="_blank" rel="noopener noreferrer" className="text-foreground font-bold underline underline-offset-4 hover:text-accent transition-colors">TikTok</a>{" "}
                at <strong>@booksphot</strong>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
