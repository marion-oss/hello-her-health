import { Container } from "@/components/Container";
import type { LandingCopy } from "@/lib/landingCopy";

export function Footer({
  productName,
  footer,
}: {
  productName: string;
  footer: LandingCopy["footer"];
}) {
  return (
    <footer className="border-t border-zinc-200/70 bg-white py-12 dark:border-zinc-900/80 dark:bg-black">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {productName}
            </div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {footer.tagline}
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3 lg:col-span-8">
            {footer.columns.map((col) => (
              <div key={col.title}>
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {col.title}
                </div>
                <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        className="hover:text-zinc-900 dark:hover:text-zinc-100"
                        href="#"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 text-xs text-zinc-500">
          © {new Date().getFullYear()} {productName}
        </div>
      </Container>
    </footer>
  );
}

