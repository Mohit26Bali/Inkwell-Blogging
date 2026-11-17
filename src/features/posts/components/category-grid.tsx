import Link from "next/link";
import { Code2, Palette, Rocket, Timer, PenTool, Folder } from "lucide-react";

import { Stagger, StaggerItem } from "@/components/motion/stagger";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Technology: Code2,
  Design: Palette,
  Startups: Rocket,
  Productivity: Timer,
  Writing: PenTool,
};

type CategoryData = {
  name: string;
  slug: string;
  description: string | null;
  _count: { posts: number };
};

export function CategoryGrid({ categories }: { categories: CategoryData[] }) {
  return (
    <Stagger className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {categories.map((category) => {
        const Icon = ICONS[category.name] ?? Folder;
        return (
          <StaggerItem key={category.slug}>
            <Link
              href={`/categories/${category.slug}`}
              className="group flex flex-col gap-3 rounded-xl border border-border/60 p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-muted/40 hover:shadow-lg"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-background group-hover:text-foreground">
                <Icon className="size-5 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <div>
                <p className="font-medium">{category.name}</p>
                <p className="text-xs text-muted-foreground">
                  {category._count.posts.toLocaleString()} articles
                </p>
              </div>
            </Link>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
