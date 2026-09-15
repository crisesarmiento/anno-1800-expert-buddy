import { createFileRoute } from "@tanstack/react-router";
import { SandboxModePage } from "@/components/sandbox-mode";
import { SessionBoot } from "@/components/session-boot";

export const Route = createFileRoute("/sandbox")({
  component: SandboxPage,
});

function SandboxPage() {
  return (
    <SessionBoot>
      <SandboxModePage />
    </SessionBoot>
  );
}
