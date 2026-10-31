import { CodeRef, type CodeRefTarget } from "@/components/decision";
import { cn } from "@/lib/cn";

/**
 * CodeRef that can shrink: the tooltip wrappers around the chip are inline-flex with an
 * automatic minimum width, so a long path would push past a narrow column without this.
 */
export function CodeRefFit({ link, className, chipClassName }: { link: CodeRefTarget; className?: string; chipClassName?: string }) {
  return (
    <span className={cn("flex min-w-0 max-w-full [&>span>span]:min-w-0 [&>span>span]:max-w-full [&>span]:min-w-0 [&>span]:max-w-full", className)}>
      <CodeRef link={link} className={chipClassName} />
    </span>
  );
}
