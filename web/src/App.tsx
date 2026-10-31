import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/NotFound";

// App pages load on demand, so the landing page does not pull in the chart library.
const Overview = lazy(() => import("@/pages/Overview"));
const DecisionExplorer = lazy(() => import("@/pages/DecisionExplorer"));
const DecisionDetail = lazy(() => import("@/pages/DecisionDetail"));
const Discussions = lazy(() => import("@/pages/Discussions"));
const PullRequests = lazy(() => import("@/pages/PullRequests"));
const CodeReferences = lazy(() => import("@/pages/CodeReferences"));
const Collections = lazy(() => import("@/pages/Collections"));
const Settings = lazy(() => import("@/pages/Settings"));

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<Overview />} />
        <Route path="decisions" element={<DecisionExplorer />} />
        <Route path="decisions/:id" element={<DecisionDetail />} />
        <Route path="discussions" element={<Discussions />} />
        <Route path="pull-requests" element={<PullRequests />} />
        <Route path="code" element={<CodeReferences />} />
        <Route path="collections" element={<Collections />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="*" element={<AppShell />}>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
