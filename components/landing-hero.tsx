"use client";

import TypewriterComponent from "typewriter-effect";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import Image from "next/image";

export const LandingHero = () => {
  const { isSignedIn } = useAuth();

  return (
    <div>
      <div className="text-white font-bold py-5 md:py-30 text-center space-y-5">
        <div className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl space-y-5 font-extrabold">
          <h1>Chapters for your videos </h1>
          <div className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-emerald-600">
            <TypewriterComponent
              options={{
                strings: [
                  "In seconds",
                  // "Photo Generation.",
                  // "Blog Writing.",
                  // "Mail Writing."
                ],
                autoStart: true,
                loop: true,
              }}
            />
          </div>
        </div>
        <div className="text-sm md:text-xl font-medium text-zinc-400">
          Stop wasting time and go straight to what matters
        </div>
        <div>
          <Link href={isSignedIn ? "/dashboard" : "/sign-up"}>
            <Button variant="premium" className="md:text-lg p-4 md:p-6 rounded-full font-semibold">
              Try it Now
            </Button>
          </Link>
        </div>
        <div className="text-zinc-400 text-xs md:text-sm font-normal">
          No credit card required.
        </div>
        <div className="mx-auto">
        <Image width={250} height={500} alt="gif" src="/gif.gif" className="mx-auto rounded-md" />

        </div>

      </div>

    </div>
  );
};
