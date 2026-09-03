import { createFileRoute } from "@tanstack/react-router";
import { SessionBoot } from "@/components/session-boot";
import { TallerBench } from "@/components/taller-bench";

export const Route = createFileRoute("/taller")({
  component: TallerPage,
});

function TallerPage() {
  return (
    <SessionBoot>
      <TallerBench />
    </SessionBoot>
  );
}
