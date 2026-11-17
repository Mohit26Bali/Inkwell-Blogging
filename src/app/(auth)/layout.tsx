import Link from "next/link";
import Image from "next/image";
import { PenLine } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const SOCIAL_PROOF = ["AI", "MC", "PS"];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <Link href="/" className="mb-10 flex items-center gap-2 text-lg font-semibold">
          <PenLine className="size-5" />
          Inkwell
        </Link>
        <Reveal className="mx-auto w-full max-w-sm">{children}</Reveal>
      </div>

      <div className="relative hidden overflow-hidden bg-neutral-950 lg:block">
        <Image
          src="/images/1.png"
          alt=""
          fill
          priority
          className="object-cover"
          sizes="50vw"
        />

        {/* Dark gradient overlay so text stays legible over the image */}
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/50 to-black/30" />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.06),transparent_55%)]"
          aria-hidden
        />

        <div className="relative flex h-full flex-col justify-between p-16">
          <Reveal>
            <span className="font-serif text-8xl leading-none text-white/10">&ldquo;</span>
          </Reveal>

          <div className="space-y-10">
            <Reveal delay={0.15}>
              <blockquote className="space-y-4">
                <p className="text-2xl font-medium leading-relaxed text-neutral-50">
                  Writing is thinking. Publish the thoughts worth keeping.
                </p>
                <footer className="text-sm text-neutral-400">
                  Join thousands of writers building an audience on Inkwell.
                </footer>
              </blockquote>
            </Reveal>

            <Reveal delay={0.25}>
              <div className="flex items-center gap-3 border-t border-white/10 pt-6">
                <div className="flex -space-x-2">
                  {SOCIAL_PROOF.map((initials, index) => (
                    <Avatar
                      key={initials}
                      className="size-8 ring-2 ring-neutral-950"
                      style={{ zIndex: SOCIAL_PROOF.length - index }}
                    >
                      <AvatarFallback className="bg-neutral-800 text-xs text-neutral-300">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <p className="text-xs text-neutral-400">
                  Ada, Marcus, Priya and 2,400+ other writers publish here
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  );
}
