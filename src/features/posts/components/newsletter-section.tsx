import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewsletterSection() {
  return (
    <section className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <h2 className="font-serif text-3xl font-medium tracking-tight">
          Get the best of Inkwell in your inbox
        </h2>
        <p className="mt-3 text-muted-foreground">
          A weekly digest of standout articles, curated by our editors. No spam, unsubscribe
          anytime.
        </p>
        <form className="mx-auto mt-8 flex max-w-md gap-2">
          <Input type="email" placeholder="you@example.com" className="h-11" required />
          <Button type="submit" size="lg" className="h-11 shrink-0">
            Subscribe
          </Button>
        </form>
      </div>
    </section>
  );
}
