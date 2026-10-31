import { Link } from "react-router-dom";
import { Logo } from "@/components/layout";
import { routes } from "@/lib/routes";
import { REPO_URL, blobUrl } from "./data";
import { Container, ExternalLink } from "./primitives";

const APP_LINKS = [
  { to: routes.overview, label: "Overview" },
  { to: routes.decisions(), label: "Decisions" },
  { to: routes.discussions(), label: "Discussions" },
  { to: routes.pullRequests, label: "Pull requests" },
];

const PROJECT_LINKS = [
  { href: REPO_URL, label: "Repository" },
  { href: blobUrl("examples/README.md"), label: "Examples" },
  { href: blobUrl("HACKATHON.md"), label: "Hackathon notes" },
  { href: blobUrl("LICENSE"), label: "MIT license" },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-line bg-bg-sunken">
      <Container className="py-14 sm:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12">
          <div className="sm:col-span-2 lg:col-span-6">
            <Logo />
            <p className="mt-4 max-w-[420px] text-sm text-fg-muted text-pretty">
              Recovers the decisions behind your code from public discussions, with verified quotes and links to the code they shaped.
            </p>
          </div>
          <nav aria-label="App" className="lg:col-span-3">
            <h2 className="text-sm font-medium text-fg">App</h2>
            <ul className="mt-3 space-y-2">
              {APP_LINKS.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="rounded text-sm text-fg-muted transition-colors hover:text-fg">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Project" className="lg:col-span-3">
            <h2 className="text-sm font-medium text-fg">Project</h2>
            <ul className="mt-3 space-y-2">
              {PROJECT_LINKS.map((l) => (
                <li key={l.label}>
                  <ExternalLink href={l.href} className="text-sm text-fg-muted no-underline hover:text-fg">
                    {l.label}
                  </ExternalLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-line pt-6 text-sm text-fg-muted sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <p>MIT license. Built by team 404-Error for Hacktoberfest 2026 Hack Day, Sonipat (Problem 06).</p>
          <p className="max-w-[460px] sm:text-right">Quotes on this page come from public discuss.python.org posts and belong to their authors.</p>
        </div>
      </Container>
    </footer>
  );
}
