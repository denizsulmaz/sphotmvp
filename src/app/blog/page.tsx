import { BLOG_POSTS } from "@/data/blog";
import BlogCard from "@/components/BlogCard";

export default function BlogIndex() {
  return (
    <div className="pb-20 bg-gray-50/50 dark:bg-black min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-12 md:pt-20">
        <div className="max-w-2xl mb-12">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 dark:text-white">
            The SPHOT Blog
          </h1>
          <p className="text-lg text-gray-500 dark:text-zinc-500 font-medium">
            Guides, tips, and stories about capturing your best moments in Seoul.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {BLOG_POSTS.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </div>
  );
}
