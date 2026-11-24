import React from "react";
import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  findFreeIntroTrail,
  getConfiguredAccessTier,
  isFreeIntroTrail,
  resetConfigurableAccessConfig,
  resolveTrailAccess,
  setConfigurableAccessConfig,
} from "@/robi/services/tokens/GameAccessService";
import {
  isMistakeTrackingEnabledForTrail,
  MISTAKE_TRACKED_TRAIL_IDS,
  MistakeSessionTracker,
} from "@/robi/services/tokens/MistakeTracker";
import { TOKEN_PACKAGES } from "@/robi/services/tokens/TokenTransactionService";
import { TRAILS } from "@/robi/data/trails/trails";
import { robiApi } from "@/server/robi/api";
import { RouterProvider } from "@/robi/router/RouterContext";
import { RobiTrailProvider } from "@/robi/context/RobiTrailContext";
import { TokenCenterPage } from "@/robi/components/pages/TokenCenterPage";
import { AccountPage } from "@/robi/components/pages/AccountPage";

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <RouterProvider>
      <RobiTrailProvider>{ui}</RobiTrailProvider>
    </RouterProvider>,
  );
}

describe("RobiTrail Tokens Economy & Access System", () => {
  beforeEach(() => {
    resetConfigurableAccessConfig();
    localStorage.clear();
  });

  it("dynamically identifies The Message Journey as the permanently free introductory game", () => {
    const freeIntro = findFreeIntroTrail();
    expect(freeIntro).toBeDefined();
    expect(freeIntro?.title.en).toBe("The Message Journey");
    expect(isFreeIntroTrail(freeIntro)).toBe(true);
    expect(getConfiguredAccessTier(freeIntro!)).toBe("free_intro");

    // Even if someone tries to configure it as token_locked, free_intro takes precedence
    setConfigurableAccessConfig({
      tokenLockedTrailIds: [freeIntro!.id, "ctg-2"],
      accountRequiredForAllNonIntro: true,
    });
    expect(getConfiguredAccessTier(freeIntro!)).toBe("free_intro");

    const access = resolveTrailAccess({
      trail: freeIntro!,
      signedIn: false,
      devTestingMode: false,
      tokenPreviewMode: true,
      unlockedTrailIds: [],
      completedTrailIds: [],
      subscriptionActive: false,
    });
    expect(access).toMatchObject({
      tier: "free_intro",
      accessible: true,
      requiresRegistration: false,
      requiresTokenUnlock: false,
      unlockCost: 0,
    });
    expect(isMistakeTrackingEnabledForTrail(freeIntro!)).toBe(false);
  });

  it("supports configurable game locks, Dev Testing Mode, and Token Preview toggle", () => {
    const targetTrail = TRAILS.find((tr) => tr.id === "ctg-2")!;
    expect(targetTrail).toBeDefined();
    expect(getConfiguredAccessTier(targetTrail)).toBe("available");

    setConfigurableAccessConfig({
      tokenLockedTrailIds: ["ctg-2", "syl-5"],
      accountRequiredForAllNonIntro: true,
    });
    expect(getConfiguredAccessTier(targetTrail)).toBe("token_locked");

    // Dev Testing Mode keeps all playable unless Token Preview toggle is enabled
    const devOpen = resolveTrailAccess({
      trail: targetTrail,
      signedIn: false,
      devTestingMode: true,
      tokenPreviewMode: false,
      unlockedTrailIds: [],
      completedTrailIds: [],
      subscriptionActive: false,
    });
    expect(devOpen.accessible).toBe(true);
    expect(devOpen.devBypass).toBe(true);

    // Token Preview Mode for guest triggers friendly registration invite
    const previewGuest = resolveTrailAccess({
      trail: targetTrail,
      signedIn: false,
      devTestingMode: true,
      tokenPreviewMode: true,
      unlockedTrailIds: [],
      completedTrailIds: [],
      subscriptionActive: false,
    });
    expect(previewGuest.accessible).toBe(false);
    expect(previewGuest.requiresRegistration).toBe(true);

    // Token Preview Mode for signed-in user prompts 2-token unlock until unlocked
    const previewSignedLocked = resolveTrailAccess({
      trail: targetTrail,
      signedIn: true,
      devTestingMode: true,
      tokenPreviewMode: true,
      unlockedTrailIds: [],
      completedTrailIds: [],
      subscriptionActive: false,
    });
    expect(previewSignedLocked.accessible).toBe(false);
    expect(previewSignedLocked.requiresTokenUnlock).toBe(true);
    expect(previewSignedLocked.unlockCost).toBe(2);

    const previewSignedUnlocked = resolveTrailAccess({
      trail: targetTrail,
      signedIn: true,
      devTestingMode: true,
      tokenPreviewMode: true,
      unlockedTrailIds: ["ctg-2"],
      completedTrailIds: [],
      subscriptionActive: false,
    });
    expect(previewSignedUnlocked.accessible).toBe(true);
    expect(previewSignedUnlocked.alreadyUnlockedByPlayer).toBe(true);
  });

  it("enforces mistake penalty every 2 validated mistakes and exempts free intro & sandbox games", () => {
    const freeIntro = findFreeIntroTrail()!;
    expect(isMistakeTrackingEnabledForTrail(freeIntro)).toBe(false);
    expect(isMistakeTrackingEnabledForTrail("ctg-2")).toBe(false);
    expect(isMistakeTrackingEnabledForTrail("ctg-3")).toBe(false);
    expect(isMistakeTrackingEnabledForTrail("dhk-1")).toBe(false);
    expect(isMistakeTrackingEnabledForTrail("syl-4")).toBe(false);

    for (const id of MISTAKE_TRACKED_TRAIL_IDS) {
      expect(isMistakeTrackingEnabledForTrail(id)).toBe(true);
    }

    const tracker = new MistakeSessionTracker("dhk-3", 900);
    const m1 = tracker.recordMistake("dhk3:faster-more-data", 1000);
    expect(m1).toMatchObject({
      counted: true,
      deductToken: false,
      warningStage: "warn_next_costs_1",
    });

    // Duplicate click within 900ms window is ignored
    const burst = tracker.recordMistake("dhk3:faster-more-data", 1200);
    expect(burst.counted).toBe(false);

    const m2 = tracker.recordMistake("dhk3:slower-less-data", 2500);
    expect(m2).toMatchObject({
      counted: true,
      deductToken: true,
      tokenCost: 1,
      warningStage: "deducted_1",
    });

    const m3 = tracker.recordMistake("dhk3:faster-more-data", 4000);
    expect(m3.warningStage).toBe("warn_next_costs_1");

    const m4 = tracker.recordMistake("dhk3:faster-more-data", 5500);
    expect(m4).toMatchObject({ deductToken: true, tokenCost: 1, mistakeCount: 4 });
  });

  it("defines the exact 6 Demo Token Shop packages and prices", () => {
    expect(TOKEN_PACKAGES.map((p) => [p.tokens, p.priceBdt])).toEqual([
      [6, 2],
      [10, 7],
      [15, 10],
      [20, 17],
      [25, 22],
      [31, 26],
    ]);
  });

  it("handles server demo registration, one-time +10 Welcome Tokens, atomic 2-token unlock, mistake floor, and Demo Shop via API", async () => {
    const phone = "01899112233";

    // 1. Create Demo Account -> receives +10 Welcome Tokens once
    const regRes = await robiApi.handle(
      new Request("http://localhost/api/account/demo-register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phone,
          displayName: "Nadia Tester",
          localCompletedTrailIds: ["ctg-4"],
        }),
      }),
    );
    expect(regRes.status).toBe(200);
    const regJson = (await regRes.json()) as {
      token: string;
      welcomeGrantedNow: boolean;
      wallet: { balance: number; welcomeRewardGranted: boolean; unlockedTrailIds: string[] };
      smsPreview: { mode: string; deliveredLive: boolean } | null;
    };
    expect(regJson.welcomeGrantedNow).toBe(true);
    expect(regJson.wallet.balance).toBe(10);
    expect(regJson.wallet.welcomeRewardGranted).toBe(true);
    expect(regJson.smsPreview?.mode).toBe("demo");
    expect(regJson.smsPreview?.deliveredLive).toBe(false);

    const authHeaders = {
      "content-type": "application/json",
      authorization: `Bearer ${regJson.token}`,
    };

    // 2. Duplicate claim-welcome is idempotent (balance stays 10)
    const dupClaim = await robiApi.handle(
      new Request("http://localhost/api/tokens/claim-welcome", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({}),
      }),
    );
    expect(dupClaim.status).toBe(200);
    const dupJson = (await dupClaim.json()) as { grantedNow: boolean; wallet: { balance: number } };
    expect(dupJson.grantedNow).toBe(false);
    expect(dupJson.wallet.balance).toBe(10);

    // 3. Unlock syl-5 for 2 tokens -> balance becomes 8, not marked completed
    const unlock1 = await robiApi.handle(
      new Request("http://localhost/api/tokens/unlock", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ trailId: "syl-5", trailTitleEn: "The Network Journey" }),
      }),
    );
    expect(unlock1.status).toBe(200);
    const u1Json = (await unlock1.json()) as {
      alreadyUnlocked: boolean;
      deducted: number;
      wallet: { balance: number; unlockedTrailIds: string[] };
    };
    expect(u1Json.deducted).toBe(2);
    expect(u1Json.alreadyUnlocked).toBe(false);
    expect(u1Json.wallet.balance).toBe(8);
    expect(u1Json.wallet.unlockedTrailIds).toContain("syl-5");

    // 4. Duplicate unlock does not double-charge
    const unlockDup = await robiApi.handle(
      new Request("http://localhost/api/tokens/unlock", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ trailId: "syl-5" }),
      }),
    );
    const uDupJson = (await unlockDup.json()) as {
      alreadyUnlocked: boolean;
      deducted: number;
      wallet: { balance: number };
    };
    expect(uDupJson.alreadyUnlocked).toBe(true);
    expect(uDupJson.deducted).toBe(0);
    expect(uDupJson.wallet.balance).toBe(8);

    // 5. Mistake deduction subtracts 1 token safely & Purchase failure leaves balance intact
    const mistakeRes = await robiApi.handle(
      new Request("http://localhost/api/tokens/mistake", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ trailId: "dhk-3", idempotencyKey: "m-test-1" }),
      }),
    );
    const mistakeJson = (await mistakeRes.json()) as {
      deducted: number;
      wallet: { balance: number };
    };
    expect(mistakeJson.deducted).toBe(1);
    expect(mistakeJson.wallet.balance).toBe(7);

    const failedShop = await robiApi.handle(
      new Request("http://localhost/api/tokens/shop/purchase", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          packageId: "pkg-6",
          simulateOutcome: "failure",
          idempotencyKey: "shop-fail-1",
        }),
      }),
    );
    expect(failedShop.status).toBe(402);
    const failedJson = (await failedShop.json()) as {
      ok: boolean;
      wallet: { balance: number };
      transaction: { status: string };
    };
    expect(failedJson.ok).toBe(false);
    expect(failedJson.wallet.balance).toBe(7);
    expect(failedJson.transaction.status).toBe("failed");

    // 6. Demo Shop success purchase credits +15 tokens (7 -> 22)
    const successShop = await robiApi.handle(
      new Request("http://localhost/api/tokens/shop/purchase", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          packageId: "pkg-15",
          simulateOutcome: "success",
          idempotencyKey: "shop-ok-1",
        }),
      }),
    );
    expect(successShop.status).toBe(200);
    const okJson = (await successShop.json()) as {
      ok: boolean;
      wallet: { balance: number };
      transaction: { amount: number; priceBdt: number; status: string };
      smsPreview: { deliveredLive: boolean } | null;
    };
    expect(okJson.ok).toBe(true);
    expect(okJson.wallet.balance).toBe(22);
    expect(okJson.transaction).toMatchObject({ amount: 15, priceBdt: 10, status: "completed" });
    expect(okJson.smsPreview?.deliveredLive).toBe(false);

    // 7. Re-register / re-login on same phone preserves balance and never re-awards +10
    const relogin = await robiApi.handle(
      new Request("http://localhost/api/account/demo-register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone }),
      }),
    );
    const reloginJson = (await relogin.json()) as {
      welcomeGrantedNow: boolean;
      wallet: { balance: number };
    };
    expect(reloginJson.welcomeGrantedNow).toBe(false);
    expect(reloginJson.wallet.balance).toBe(22);
  });

  it("renders TokenCenterPage with 6 packages, Buy Now confirmation modal, and Trail-Pass-free AccountPage with mission progress", async () => {
    const { waitFor } = await import("@testing-library/react");
    renderWithProviders(<TokenCenterPage />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Token Center/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: /How Tokens Work/i })).toBeInTheDocument();
    expect(screen.getByText("6 Tokens")).toBeInTheDocument();
    expect(screen.getByText("BDT 2")).toBeInTheDocument();
    expect(screen.getByText("31 Tokens")).toBeInTheDocument();
    expect(screen.getByText("BDT 26")).toBeInTheDocument();

    const buyButtons = screen.getAllByRole("button", { name: /Buy Now/i });
    expect(buyButtons).toHaveLength(6);
    fireEvent.click(buyButtons[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Confirm Token Purchase/i)).toBeInTheDocument();
    expect(
      screen.getByText(/BDT 2 will be charged from your Robi mobile balance/i),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));

    renderWithProviders(<AccountPage />);
    expect(
      screen.getByRole("button", { name: /Create Demo Account \(\+10 Tokens\)/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Create Account/i }));
    expect(screen.getByText(/Robi Mobile Account/i)).toBeInTheDocument();
    expect(screen.getByText(/Mission Progress Summary/i)).toBeInTheDocument();
    expect(screen.queryByText(/Trail Pass/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Free Tier Active/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Subscribe \(Trail Pass\)/i)).not.toBeInTheDocument();
  });
});
