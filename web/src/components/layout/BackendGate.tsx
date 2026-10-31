import type { ReactNode } from "react";
import { useBackendStatus } from "@/api/backend-status";
import { BackendOffline } from "./BackendOffline";
import { PageContainer } from "./PageHeader";

/** Replaces page content with the "start the backend" state while the API is unreachable. */
export function BackendGate({ children }: { children: ReactNode }) {
  const { state } = useBackendStatus();
  if (state === "offline") {
    return (
      <PageContainer>
        <BackendOffline as="h1" />
      </PageContainer>
    );
  }
  return <>{children}</>;
}
