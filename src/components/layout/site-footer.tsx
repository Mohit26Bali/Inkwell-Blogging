import Link from "next/link";
import { PenLine } from "lucide-react";

const FOOTER_LINKS = {
  Product: [
    { href: "/discover", label: "Discover" },
    { href: "/new-post", label: "Write" },
    { href: "/pricing", label: "Pricing" },
  ],
  Company: [
    { href: "/about", label: "About" },
    { href: "/careers", label: "Careers" },
    { href: "/contact", label: "Contact" },
  ],
  Resources: [
    { href: "/help", label: "Help center" },
    { href: "/guidelines", label: "Community guidelines" },
    { href: "/rss.xml", label: "RSS" },
  ],
  Legal: [
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
  ],
};

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
              <PenLine className="size-5" />
              Inkwell
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              A modern publishing platform for writers who care about craft.
            </p>
          </div>
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <h3 className="text-sm font-medium">{section}</h3>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Inkwell. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
