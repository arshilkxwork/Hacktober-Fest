import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Menu as MenuIcon, Moon, Search, Sun, X } from "lucide-react";
import { IconButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Kbd, modKey } from "@/components/ui/Kbd";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";
import { useTheme } from "@/lib/theme";
import { titleForPath } from "./nav";
import { StatusPill } from "./StatusPill";

function SearchForm({ autoFocus, onDone, inputRef, className }: { autoFocus?: boolean; onDone?: () => void; inputRef?: RefObject<HTMLInputElement>; className?: string }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const [q, setQ] = useState(pathname === "/app/decisions" ? (params.get("q") ?? "") : "");

  useEffect(() => {
    if (pathname === "/app/decisions") setQ(params.get("q") ?? "");
  }, [pathname, params]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(routes.decisions(q.trim() || undefined));
    inputRef?.current?.blur();
    onDone?.();
  };

  return (
    <form role="search" onSubmit={submit} className={className}>
      <label htmlFor="global-search" className="sr-only">
        Search decisions
      </label>
      <Input
        id="global-search"
        ref={inputRef}
        type="search"
        icon={Search}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search decisions, files, people"
        autoFocus={autoFocus}
        autoComplete="off"
        trailing={
          <span className="hidden items-center gap-0.5 lg:flex">
            <Kbd>{modKey}</Kbd>
            <Kbd>K</Kbd>
          </span>
        }
      />
    </form>
  );
}

export function TopBar({ onOpenNav }: { onOpenNav: () => void }) {
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();
  const [mobileSearch, setMobileSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (searchRef.current && searchRef.current.offsetParent !== null) {
          searchRef.current.focus();
          searchRef.current.select();
        } else setMobileSearch(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setMobileSearch(false), [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg">
      <div className="flex h-topbar items-center gap-3 px-4 sm:px-6 lg:px-8">
        <IconButton icon={MenuIcon} label="Open navigation" className="-ml-1.5 md:hidden" onClick={onOpenNav} tooltip={false} />
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-fg md:flex-none md:basis-48">{titleForPath(pathname)}</p>
        <SearchForm inputRef={searchRef} className="hidden max-w-md flex-1 sm:block" />
        <div className="ml-auto flex items-center gap-1.5">
          <IconButton
            icon={mobileSearch ? X : Search}
            label={mobileSearch ? "Close search" : "Search decisions"}
            className="sm:hidden"
            tooltip={false}
            onClick={() => setMobileSearch((v) => !v)}
          />
          <StatusPill />
          <IconButton
            icon={theme === "dark" ? Sun : Moon}
            label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            onClick={toggle}
            tooltipAlign="end"
          />
        </div>
      </div>
      <div className={cn("border-t border-line px-4 py-2 sm:hidden", mobileSearch ? "block" : "hidden")}>
        {mobileSearch ? <SearchForm autoFocus onDone={() => setMobileSearch(false)} /> : null}
      </div>
    </header>
  );
}
