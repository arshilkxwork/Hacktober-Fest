import { Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="*" element={<AppShell />}>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
