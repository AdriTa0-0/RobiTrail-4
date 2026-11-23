import { createFileRoute } from "@tanstack/react-router";

const handle = async ({ request }: { request: Request }) => {
  const { robiApi } = await import("@/server/robi/api");
  return robiApi.handle(request);
};

export const Route = createFileRoute("/api/$")({
  server: { handlers: { GET: handle, POST: handle, PUT: handle, PATCH: handle, DELETE: handle } },
});
