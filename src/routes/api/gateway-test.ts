
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import { testPhpGatewayConnection } from "@/server/robi/phpGatewayClient";

export const Route = createFileRoute("/api/gateway-test")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.FIRESTORE_TEST_KEY || "";
        const supplied = request.headers.get("x-firestore-test-key") || "";
        const a = Buffer.from(secret);
        const b = Buffer.from(supplied);
        if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) {
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        const result = await testPhpGatewayConnection();

        return Response.json({
          ok: result.ok,
          httpStatus: result.httpStatus,
          data: result.data,
          error: result.error,
        });
      },
    },
  },
});
