import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Github, Moon, Sun } from "lucide-react";
import { Logo } from "@/components/layout";
import { ButtonLink, IconButton, buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";
import { useTheme } from "@/lib/theme";
import { REPO_URL } from "./data";
import { Container } from "./primitives";

const LINKS = [
  { href: "#problem", label: "Why" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#examples", label: "Examples" },
  { href: "#pull-requests", label: "Pull requests" },
  { href: "#stack", label: "Stack" },
];

export function LandingNav() {
  const { theme, toggle } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={cn("sticky top-0 z-30 border-b bg-bg transition-colors duration-200", scrolled ? "border-line" : "border-transparent")}>
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-8">
          <Link to={routes.landing} className="rounded" aria-label="DecisionTrail home">
            <Logo />
          </Link>
          <nav aria-label="Page sections" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="rounded px-2.5 py-1.5 text-sm text-fg-muted transition-colors hover:bg-surface-raised hover:text-fg">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="DecisionTrail on GitHub (opens in a new tab)"
            className={buttonClasses({ variant: "ghost", size: "md", className: "size-8 px-0" })}
          >
            <Github aria-hidden strokeWidth={1.75} />
          </a>
          <IconButton icon={theme === "dark" ? Sun : Moon} label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} onClick={toggle} tooltipAlign="end" />
          <ButtonLink to={routes.overview} variant="primary" size="md" iconRight={ArrowRight} className="ml-1.5">
            Open the app
          </ButtonLink>
        </div>
      </Container>
    </header>
  );
}
