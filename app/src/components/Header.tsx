import { Container } from "@/components/Container";
import { GlassButton } from "@/components/GlassButton";

export function Header({ productName }: { productName: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <a
            href="#top"
            className="text-sm font-semibold tracking-tight text-white"
          >
            {productName}
          </a>

          <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
            <a className="hover:text-white transition-colors" href="#how">How it works</a>
            <a className="hover:text-white transition-colors" href="#use-cases">Use cases</a>
            <a className="hover:text-white transition-colors" href="#faq">FAQ</a>
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex">
              <GlassButton
                href="#demo"
                variant="secondary"
                eventName="watch_demo_clicked"
              >
                Watch Demo
              </GlassButton>
            </span>
            <GlassButton
              openSheet
              href="#request-access"
              eventName="request_access_clicked"
            >
              Request Access
            </GlassButton>
          </div>
        </div>
      </Container>
    </header>
  );
}
