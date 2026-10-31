import { NavLink } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useBackendStatus } from "@/api/backend-status";
import { IconButton } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";
import { Logo } from "./Logo";
import { NAV_FOOTER, NAV_MAIN, type NavItem } from "./nav";

function NavEntry({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      aria-label={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          "group relative flex h-8 items-center gap-2.5 rounded px-2 text-sm transition-colors duration-100",
          collapsed && "w-9 justify-center px-0",
          isActive ? "bg-surface-raised text-fg" : "text-fg-muted hover:bg-surface-raised/60 hover:text-fg",
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* The selection mark: one accent line on the item's edge. */}
          <span
            aria-hidden
            className={cn("absolute left-0 top-2 h-4 w-px bg-accent transition-opacity duration-150", isActive ? "opacity-100" : "opacity-0")}
          />
          <Icon aria-hidden strokeWidth={1.75} className={cn("size-4 shrink-0", isActive ? "text-fg" : "text-fg-subtle group-hover:text-fg-muted")} />
          {collapsed ? null : <span className="truncate">{item.label}</span>}
        </>
      )}
    </NavLink>
  );
  return collapsed ? (
    <Tooltip content={item.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

/**
 * Navigation column. Used fixed on desktop (collapsible) and inside a Sheet on phones.
 */
export function Sidebar({
  collapsed = false,
  onToggleCollapsed,
  onNavigate,
  className,
}: {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onNavigate?: () => void;
  className?: string;
}) {
  const { health } = useBackendStatus();
  return (
    <nav aria-label="Main" className={cn("flex h-full flex-col bg-bg", className)}>
      <div className={cn("flex h-topbar shrink-0 items-center gap-2 px-3", collapsed ? "justify-center" : "justify-between")}>
        <NavLink to="/app" onClick={onNavigate} className="rounded px-1 py-1" aria-label="DecisionTrail overview">
          <Logo collapsed={collapsed} />
        </NavLink>
        {onToggleCollapsed && !collapsed ? (
          <IconButton icon={PanelLeftClose} label="Collapse sidebar" size="sm" tooltipSide="right" onClick={onToggleCollapsed} />
        ) : null}
      </div>

      <div className={cn("flex flex-1 flex-col gap-0.5 overflow-y-auto py-2", collapsed ? "items-center px-2" : "px-3")}>
        {NAV_MAIN.map((item) => (
          <NavEntry key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </div>

      <div className={cn("flex shrink-0 flex-col gap-0.5 border-t border-line py-2", collapsed ? "items-center px-2" : "px-3")}>
        {NAV_FOOTER.map((item) => (
          <NavEntry key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
        {onToggleCollapsed && collapsed ? (
          <IconButton icon={PanelLeftOpen} label="Expand sidebar" size="md" tooltipSide="right" onClick={onToggleCollapsed} className="mt-1" />
        ) : null}
        {!collapsed ? (
          <p className="truncate px-2 pb-1 pt-2 text-xs text-fg-muted" title={health?.store_path}>
            Local workspace{health ? ` · v${health.version}` : ""}
          </p>
        ) : null}
      </div>
    </nav>
  );
}
