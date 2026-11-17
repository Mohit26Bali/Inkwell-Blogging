import type { Metadata } from "next";

import { getCategoriesWithCounts } from "@/features/posts/services/post.service";
import { CategoryGrid } from "@/features/posts/components/category-grid";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse Inkwell articles by topic.",
};

export default async function CategoriesPage() {
  const categories = await getCategoriesWithCounts();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">Categories</h1>
      <p className="mt-2 text-muted-foreground">Browse articles by topic.</p>
      <div className="mt-10">
        <CategoryGrid categories={categories} />
      </div>
    </div>
  );
}
