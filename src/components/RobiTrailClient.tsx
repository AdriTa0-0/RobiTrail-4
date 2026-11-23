import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const RobiApp = lazy(() => import("@/robi/App"));

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <span className="font-display text-xl font-extrabold">
        <span className="text-rose-600">Robi</span>Trail
      </span>
    </div>
  );
}

/** The RobiTrail app (3D scenes, GSAP, audio) runs in the browser only. */
export function RobiTrailClient() {
  return (
    <ClientOnly fallback={<Loading />}>
      <Suspense fallback={<Loading />}>
        <RobiApp />
      </Suspense>
    </ClientOnly>
  );
}
