import { createFileRoute } from "@tanstack/react-router";
import { RobiTrailClient } from "@/components/RobiTrailClient";
import { pageHead } from "@/lib/pageMeta";

export const Route = createFileRoute("/")({
  head: () => pageHead("/"),
  component: RobiTrailClient,
});
