import { createFileRoute } from "@tanstack/react-router";
import { HarborApp } from "@/components/harbor-app";
import { SessionBoot } from "@/components/session-boot";

export const Route = createFileRoute("/diario")({ component: Diary });

function Diary() {
  return (
    <SessionBoot>
      <HarborApp />
    </SessionBoot>
  );
}
