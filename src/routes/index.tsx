import { createFileRoute } from "@tanstack/react-router";
import { HarborApp } from "@/components/harbor-app";
import { SessionBoot } from "@/components/session-boot";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <SessionBoot>
      <HarborApp />
    </SessionBoot>
  );
}
