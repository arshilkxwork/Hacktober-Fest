import { useLocation } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { ButtonLink } from "@/components/ui";
import { routes } from "@/lib/routes";

export default function NotFound() {
  const { pathname } = useLocation();
  return (
    <PageContainer width="narrow">
      <section className="flex flex-col items-start gap-5 py-16 sm:py-24" aria-labelledby="nf-title">
        <Compass aria-hidden strokeWidth={1.5} className="size-7 text-fg-subtle" />
        <div>
          <h1 id="nf-title" className="text-3xl font-semibold text-fg">
            No page at this address
          </h1>
          <p className="mt-2 max-w-lg text-sm text-fg-muted">
            Nothing lives at <code className="rounded-sm bg-surface-raised px-1 py-0.5 font-mono text-xs text-fg">{pathname}</code>. The link may be
            old, or the decision may have been removed from the store.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink to={routes.overview} variant="primary" icon={ArrowLeft}>
            Back to overview
          </ButtonLink>
          <ButtonLink to={routes.decisions()}>Browse decisions</ButtonLink>
        </div>
      </section>
    </PageContainer>
  );
}
