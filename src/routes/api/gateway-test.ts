
import { createFileRoute } from "@tanstack/react-router";
import { testPhpGatewayConnection } from "@/server/robi/phpGatewayClient";

export const Route = createFileRoute("/api/gateway-test")({
  server: {
    handlers: {
      GET: async () => {
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
