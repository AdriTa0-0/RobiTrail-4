
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import { testFirestoreReadConnection } from "@/server/robi/firestoreWalletStore";

export const Route = createFileRoute("/api/firestore-test")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const configuredKey = process.env.FIRESTORE_TEST_KEY;

        if (!configuredKey) {
          return Response.json(
            { ok: false, error: "Test endpoint disabled" },
            { status: 503 }
          );
        }

        const suppliedKey = request.headers.get("x-firestore-test-key") ?? "";
        const expected = Buffer.from(configuredKey);
        const supplied = Buffer.from(suppliedKey);

        if (
          expected.length !== supplied.length ||
          !timingSafeEqual(expected, supplied)
        ) {
          return Response.json(
            { ok: false, error: "Unauthorized" },
            { status: 401 }
          );
        }

        try {
          const result = await testFirestoreReadConnection();

          return Response.json({
            ok: true,
            connected: result.connected,
            projectId: result.projectId,
            databaseId: result.databaseId,
          });
        } catch (error) {
          console.error("Firestore connection test failed:", error);

          return Response.json(
            { ok: false, error: "Firestore connection failed" },
            { status: 503 }
          );
        }
      },
    },
  },
});
