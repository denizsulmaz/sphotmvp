import { BLOG_POSTS } from "@/data/blog";
import { notFound } from "next/navigation";
import BlogContentClient from "./BlogContentClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({
    slug: post.slug,
  }));
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = BLOG_POSTS.find((p) => p.slug === params.slug);

  if (!post) {
    notFound();
  }

  // Generate structured data for AIO/SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "SPHOT",
      logo: {
        "@type": "ImageObject",
        url: "https://booksphot.com/logo.png"
      }
    },
    datePublished: post.date,
  };

  return (
    <article className="pb-20 bg-white dark:bg-black min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-8">
        <Link href="/blog" className="inline-flex items-center gap-2 text-gray-500 hover:text-foreground dark:text-zinc-500 dark:hover:text-white font-semibold mb-8 transition-colors">
          <ArrowLeft size={20} />
          Back to Blog
        </Link>
        
        {/* We use a client component for the title/content so it can be translated via MyMemory */}
        <BlogContentClient post={post} />
      </div>
    </article>
  );
}
