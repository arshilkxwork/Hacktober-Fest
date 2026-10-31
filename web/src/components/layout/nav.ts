import { Code2, FolderHeart, GitPullRequest, LayoutDashboard, ListTree, MessagesSquare, Settings, type LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Match only the exact path (for the index route). */
  end?: boolean;
  description: string;
}

export const NAV_MAIN: NavItem[] = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, end: true, description: "Decisions recovered so far, and where they came from." },
  { to: "/app/decisions", label: "Decision Explorer", icon: ListTree, description: "Search and filter every recovered decision." },
  { to: "/app/discussions", label: "Discussions", icon: MessagesSquare, description: "The threads behind the decisions, and new analyses." },
  { to: "/app/pull-requests", label: "Pull Request Analysis", icon: GitPullRequest, description: "Check a change against the decisions it touches." },
  { to: "/app/code", label: "Code References", icon: Code2, description: "Files and symbols that past decisions are about." },
  { to: "/app/collections", label: "Collections", icon: FolderHeart, description: "Decisions you have grouped for later." },
];

export const NAV_FOOTER: NavItem[] = [
  { to: "/app/settings", label: "Settings", icon: Settings, description: "Backend, model, repositories and appearance." },
];

export const NAV_ALL = [...NAV_MAIN, ...NAV_FOOTER];

/** Title for the top bar, from the current path. */
export function titleForPath(pathname: string): string {
  if (/^\/app\/decisions\/.+/.test(pathname)) return "Decision";
  const match = [...NAV_ALL].sort((a, b) => b.to.length - a.to.length).find((n) => (n.end ? pathname === n.to || pathname === `${n.to}/` : pathname.startsWith(n.to)));
  return match?.label ?? "Not found";
}
