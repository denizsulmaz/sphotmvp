"use client";

import Link from "next/link";
import { BlogPost } from "@/data/blog";
import { useLanguage } from "@/context/LanguageContext";
import { useEffect, useState } from "react";
import { translateFields } from "@/lib/translate";

interface Props {
  post: BlogPost;
}

export default function BlogCard({ post }: Props) {
  const { lang, t } = useLanguage();
  const [translated, setTranslated] = useState({ title: post.title, excerpt: post.excerpt });
  const [isLoading, setIsLoading] = useState(lang !== "en");

  useEffect(() => {
    let isMounted = true;
    if (lang === "en") {
      setTranslated({ title: post.title, excerpt: post.excerpt });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    translateFields(
      { title: post.title, excerpt: post.excerpt },
      lang,
      post.slug
    ).then((res) => {
      if (isMounted) {
        setTranslated({ title: res.title, excerpt: res.excerpt });
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [lang, post.slug, post.title, post.excerpt]);

  return (
    <Link 
      href={`/blog/${post.slug}`}
      className="group flex flex-col bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
    >
      <div className="h-48 bg-gray-100 dark:bg-zinc-800 overflow-hidden relative">
        <img 
          src={post.coverImage} 
          alt={post.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded text-[10px] font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300 border border-transparent dark:border-zinc-800">
          SPHOT Blog
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="text-xs font-bold text-gray-500 dark:text-zinc-500 mb-2 uppercase tracking-wider">
          {post.date} · By {post.author}
        </div>
        <h3 className={`text-xl font-bold mb-3 leading-tight text-foreground dark:text-white transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
          {translated.title}
        </h3>
        <p className={`text-gray-500 dark:text-zinc-400 text-sm leading-relaxed mb-4 flex-1 transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
          {translated.excerpt}
        </p>
        <div className="mt-auto text-sm font-bold border-b-2 border-transparent group-hover:border-foreground dark:group-hover:border-white w-max pb-0.5 transition-colors">
          Read More →
        </div>
      </div>
    </Link>
  );
}
