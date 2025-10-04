// HomePage.tsx
import { Globe } from "../../../frontend/src/components/ui/globe";

export default function HomePage() {
  return (
    <div className="relative min-h-svh w-full overflow-hidden rounded-lg border px-6 py-12 md:px-40 md:pt-16 md:pb-60">
      
      
      <div className="relative z-20 mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
              {/* 2) Fullscreen video; black removed via mix-blend-screen */}

        
        <h1 className="text-5xl font-semibold tracking-tight text-balance text-gray-900 dark:text-white sm:text-7xl">
          Shark Finder
        </h1>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <a
            href="/investor/signup"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            Investor Sign Up
          </a>
          <a
            href="/firm/signup"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-6 py-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            Firm Sign Up
          </a>
          <a
            href="/signin"
            className="inline-flex items-center justify-center rounded-xl px-6 bg-gray-800 py-3 text-sm font-medium text-foreground/90 transition hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            Sign in
          </a>
        </div>
      </div>

      {/* Globe peeking from bottom */}
      <Globe
        className="
          absolute z-10
          w-[100vh] top-50 aspect-square
        "
      />

      <div className="pointer-events-none absolute inset-0 z-0 h-full bg-[radial-gradient(circle_at_50%_200%,rgba(255,255,255,0.12),rgba(255,255,255,0))] dark:bg-[radial-gradient(circle_at_50%_200%,rgba(255,255,255,0.06),rgba(255,255,255,0))]" />
    </div>
  );
}
