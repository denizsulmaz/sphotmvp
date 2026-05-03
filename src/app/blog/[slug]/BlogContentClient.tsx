"use client";

import { BlogPost, BLOG_POSTS } from "@/data/blog";
import { useLanguage } from "@/context/LanguageContext";
import { useEffect, useState } from "react";
import { translateFields } from "@/lib/translate";
import Link from "next/link";

interface Props {
  post: BlogPost;
}

export default function BlogContentClient({ post }: Props) {
  const { lang } = useLanguage();
  const [translated, setTranslated] = useState({ title: post.title, content: post.content });
  const [isLoading, setIsLoading] = useState(lang !== "en");

  useEffect(() => {
    let isMounted = true;
    if (lang === "en") {
      setTranslated({ title: post.title, content: post.content });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    translateFields(
      { title: post.title, content: post.content },
      lang,
      post.slug
    ).then((res) => {
      if (isMounted) {
        setTranslated({ title: res.title, content: res.content });
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [lang, post.slug, post.title, post.content]);

  // Simple Markdown to HTML logic for the client side
  const renderMarkdown = (text: string) => {
    let html = text
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-8 mb-4 dark:text-white">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-10 mb-5 dark:text-white">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-black mt-12 mb-6 dark:text-white">$1</h1>')
      .replace(/\*\*Step (\d+): ([^*]+)\*\*\n([^\n]+)/gi, '<div class="flex flex-col sm:flex-row gap-5 bg-gray-50 dark:bg-zinc-900 p-6 rounded-2xl my-6 border border-gray-100 dark:border-zinc-800"><div class="flex-shrink-0 w-12 h-12 bg-accent text-black font-black text-xl rounded-full flex items-center justify-center">$1</div><div><h4 class="text-xl font-bold dark:text-white mb-2 !mt-0">$2</h4><p class="text-gray-600 dark:text-zinc-400 !mb-0 leading-relaxed">$3</p></div></div>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-accent pl-4 italic my-4">$1</blockquote>')
      .replace(/!\[Photo by ([^\]]+)\]\(([^)]+)\)/gim, '<figure class="my-8"><img src="$2" alt="Photo by $1" class="w-full rounded-2xl object-cover max-h-[480px]" loading="lazy" /><figcaption class="text-xs text-gray-400 dark:text-zinc-500 mt-2 text-center italic">Photo by $1</figcaption></figure>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<figure class="my-8"><img src="$2" alt="$1" class="w-full rounded-2xl object-cover max-h-[480px]" loading="lazy" /><figcaption class="text-xs text-gray-400 dark:text-zinc-500 mt-2 text-center italic">$1</figcaption></figure>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>');

    return { __html: html };
  };

  return (
    <>
      {isLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-sm transition-opacity duration-300">
          <div className="animate-spin w-12 h-12 border-4 border-accent border-t-transparent rounded-full mb-4"></div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">Translating Content...</p>
        </div>
      )}
      <div className={`transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
      <div className="text-sm font-bold text-gray-500 dark:text-zinc-500 mb-4 uppercase tracking-wider">
        {post.date} · By {post.author}
      </div>
      <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-8 leading-tight dark:text-white">
        {translated.title}
      </h1>
      
      <div className="w-full aspect-[2/1] bg-gray-100 dark:bg-zinc-900 rounded-3xl overflow-hidden mb-12 relative">
        <img 
          src={post.coverImage} 
          alt={post.title} 
          className="w-full h-full object-cover"
        />
        {post.coverImageCredit && (
          <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[10px] text-white/90 italic">
            Photo by {post.coverImageCredit}
          </div>
        )}
      </div>

      <div 
        className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-foreground dark:prose-headings:text-white prose-a:text-accent pb-16"
        dangerouslySetInnerHTML={renderMarkdown(translated.content)}
      />

      {/* Related Posts */}
      <div className="mt-12 pt-12 border-t border-gray-200 dark:border-zinc-800">
        <h3 className="text-2xl font-bold dark:text-white mb-8">Keep Exploring</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {BLOG_POSTS.filter(p => p.slug !== post.slug).slice(0, 3).map(relatedPost => (
            <Link key={relatedPost.slug} href={`/blog/${relatedPost.slug}`} className="group block">
              <div className="aspect-[4/3] bg-gray-100 dark:bg-zinc-900 rounded-2xl overflow-hidden mb-4 relative">
                <img 
                  src={relatedPost.coverImage} 
                  alt={relatedPost.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
              </div>
              <h4 className="font-bold text-lg dark:text-white group-hover:text-accent transition-colors leading-tight mb-2 line-clamp-2">
                {relatedPost.title}
              </h4>
              <p className="text-sm text-gray-500 dark:text-zinc-400 line-clamp-2">
                {relatedPost.excerpt}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
    </>
  );
}
