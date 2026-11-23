import { describe, expect, it } from "vitest";
import { CITIES, getCityById } from "@/robi/data/cities/cities";
import { getTrailById, getTrailsForCity, TRAILS } from "@/robi/data/trails/trails";
import { DEV_TESTING_MODE } from "@/robi/context/RobiTrailContext";
import {
  CITY_TRAIL_GROUPS,
  VALID_TRAIL_IDS,
  computeAchievements,
  sanitizeTrailIds,
  upsertAccount,
} from "@/server/robi/dbStore";
import { robiApi } from "@/server/robi/api";

describe("Chattogram & 16-trail catalog restoration", () => {
  it("registers ctg-4 (The Message Journey) while keeping ctg-1 through ctg-3 intact", () => {
    expect(TRAILS).toHaveLength(16);

    const chattogramTrails = getTrailsForCity("chattogram");
    expect(chattogramTrails.map((t) => t.id)).toEqual(["ctg-1", "ctg-2", "ctg-3", "ctg-4"]);
    expect(chattogramTrails.map((t) => t.order)).toEqual([1, 2, 3, 4]);

    expect(getTrailById("ctg-1")?.title.en).toBe("Robi Sheba — The Missing Signal Case");
    expect(getTrailById("ctg-2")?.title.en).toBe("Rooftop Network Puzzle");
    expect(getTrailById("ctg-3")?.title.en).toBe("Harbour Packet Chase");
    expect(getTrailById("ctg-4")?.title.en).toBe("The Message Journey");

    const chattogram = getCityById("chattogram");
    expect(chattogram?.trailIds).toEqual(["ctg-1", "ctg-2", "ctg-3", "ctg-4"]);

    const totalFromCities = CITIES.reduce((sum, c) => sum + c.trailIds.length, 0);
    expect(totalFromCities).toBe(16);
    expect(getTrailsForCity("dhaka")).toHaveLength(5);
    expect(getTrailsForCity("sylhet")).toHaveLength(7);
  });

  it("keeps server VALID_TRAIL_IDS, Chattogram achievement, and progress sync aligned with 16 trails", () => {
    expect(VALID_TRAIL_IDS).toHaveLength(16);
    expect(VALID_TRAIL_IDS).toContain("ctg-4");
    expect(CITY_TRAIL_GROUPS.chattogram).toEqual(["ctg-1", "ctg-2", "ctg-3", "ctg-4"]);

    const sanitized = sanitizeTrailIds(["ctg-1", "ctg-4", "invalid-id", "syl-7", "ctg-4"]);
    expect(sanitized).toEqual(["ctg-1", "ctg-4", "syl-7"]);

    const partialChattogram = computeAchievements(["ctg-1", "ctg-2", "ctg-3"]);
    expect(partialChattogram.some((a) => a.id === "ach-chattogram")).toBe(false);

    const fullChattogram = computeAchievements(["ctg-1", "ctg-2", "ctg-3", "ctg-4"]);
    expect(fullChattogram.some((a) => a.id === "ach-chattogram")).toBe(true);

    const updatedAccount = upsertAccount("8801812345678", "88018****678", {
      completedTrailIds: ["ctg-4", "ctg-2"],
    });
    expect(updatedAccount.completedTrailIds).toEqual(expect.arrayContaining(["ctg-4", "ctg-2"]));
  });

  it("reports 16 trails in server subscription disclosure and passes health check", async () => {
    const healthRes = await robiApi.handle(new Request("http://localhost/api/health"));
    expect(healthRes.status).toBe(200);
    const healthJson = (await healthRes.json()) as { ok: boolean };
    expect(healthJson.ok).toBe(true);

    const eligRes = await robiApi.handle(
      new Request("http://localhost/api/bdapps/eligibility", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phoneNumber: "01812345678" }),
      }),
    );
    expect(eligRes.status).toBe(200);
    const eligJson = (await eligRes.json()) as { terms: { planName: string } };
    expect(eligJson.terms.planName).toContain("16 City Trails");
  });

  it("binds DEV_TESTING_MODE strictly to Vite dev environment", () => {
    expect(DEV_TESTING_MODE).toBe(Boolean(import.meta.env.DEV));
  });
});
