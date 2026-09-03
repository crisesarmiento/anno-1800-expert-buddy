import { createFileRoute } from "@tanstack/react-router";
import { SandboxModePage } from "@/components/sandbox-mode";

export const Route = createFileRoute("/sandbox")({
  component: SandboxPage,
});

function SandboxPage() {
  return <SandboxModePage />;
}
