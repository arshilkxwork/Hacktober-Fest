import { Suspense, useEffect, useState } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sheet } from "@/components/ui/Dialog";
import { cn } from "@/lib/cn";
import { readStorage, writeStorage } from "@/lib/storage";
import { BackendGate } from "./BackendGate";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

const COLLAPSE_KEY = "decisiontrail.sidebar.collapsed";

/** Freezes the outlet so the leaving page can animate out with its own content. */
function AnimatedOutlet() {
  const outlet = useOutlet();
  const [frozen] = useState(outlet);
  return <Suspense fallback={null}>{frozen}</Suspense>;
}

export function AppShell() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<boolean>(() =>
    readStorage(COLLAPSE_KEY, false),
  );
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => writeStorage(COLLAPSE_KEY, collapsed), [collapsed]);
  useEffect(() => {
    setNavOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh bg-bg">
      <a
        href="#main"
        className="sr-only z-[60] rounded bg-fg px-3 py-2 text-sm text-fg-inverse focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 border-r border-line transition-[width] duration-200 ease-out md:block",
          collapsed ? "w-sidebar-collapsed" : "w-sidebar",
        )}
      >
        <Sidebar
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((c) => !c)}
        />
      </aside>

      <Sheet
        open={navOpen}
        onClose={() => setNavOpen(false)}
        label="Navigation"
      >
        <Sidebar onNavigate={() => setNavOpen(false)} />
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenNav={() => setNavOpen(true)} />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          <BackendGate>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              >
                <AnimatedOutlet />
              </motion.div>
            </AnimatePresence>
          </BackendGate>
        </main>
      </div>
    </div>
  );
}
