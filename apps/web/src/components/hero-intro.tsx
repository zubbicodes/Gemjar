"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

export function HeroIntro({
  eyebrow,
  headline,
  emphasis,
  introduction,
}: {
  eyebrow: string;
  headline: string;
  emphasis: string;
  introduction: string;
}) {
  const reduceMotion = useReducedMotion();
  const hidden = reduceMotion ? {} : { opacity: 0, y: 22 };
  return (
    <div className="flex min-w-0 flex-col justify-center px-5 py-16 sm:px-10 lg:px-[max(2.5rem,calc((100vw-1440px)/2+2.5rem))] lg:py-24">
      <motion.p
        initial={hidden}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="text-[10px] font-bold uppercase tracking-[0.2em] text-forest"
      >
        {eyebrow}
      </motion.p>
      <motion.h1
        initial={hidden}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.08, ease: EASE }}
        className="display-safe mt-5 max-w-3xl font-display text-[clamp(3.5rem,7vw,5.5rem)] font-extrabold leading-[.9] tracking-[-0.06em]"
      >
        <span className="text-forest">{headline}</span> {emphasis}
      </motion.h1>
      <motion.p
        initial={hidden}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.18, ease: EASE }}
        className="mt-7 max-w-lg text-base font-medium leading-7 text-ink/75"
      >
        {introduction}
      </motion.p>
      <motion.div
        initial={hidden}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.28, ease: EASE }}
        className="mt-9 flex flex-wrap gap-3"
      >
        <Link href="/shop" className={cn(buttonVariants({ size: "lg" }))}>
          Shop colourful comfort <ArrowRight className="size-4" />
        </Link>
        <Link
          href="/trade"
          className={cn(
            buttonVariants({ variant: "secondary", size: "lg" }),
            "border-ink/20 bg-paper/55",
          )}
        >
          Wholesale
        </Link>
      </motion.div>
    </div>
  );
}
