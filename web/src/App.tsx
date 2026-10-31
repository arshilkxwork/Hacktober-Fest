import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/NotFound";

// App pages load on demand, so the landing page does not pull in the chart library.
const Overview = lazy(() => import("@/pages/Overview"));
const DecisionExplorer = lazy(() => import("@/pages/DecisionExplorer"));
const DecisionDetail = lazy(() => import("@/pages/DecisionDetail"));

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<Overview />} />
        <Route path="decisions" element={<DecisionExplorer />} />
        <Route path="decisions/:id" element={<DecisionDetail />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="*" element={<AppShell />}>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
