import { createFileRoute } from "@tanstack/react-router";
import { RobiTrailClient } from "@/components/RobiTrailClient";
import { pageHead } from "@/lib/pageMeta";

// All RobiTrail pages share the app's own in-app navigation; this route serves each URL.
export const Route = createFileRoute("/$")({
  head: ({ params }) => pageHead("/" + (params._splat ?? "")),
  component: RobiTrailClient,
});
