import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { robiApi } from "@/server/robi/api";
import { RouterProvider } from "@/robi/router/RouterContext";
import { RobiTrailProvider } from "@/robi/context/RobiTrailContext";
import { AccountPage } from "@/robi/components/pages/AccountPage";
import { inspectRobiPhoneNumber } from "@/robi/services/bdapps/bdappsClient";

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <RouterProvider>
      <RobiTrailProvider>{ui}</RobiTrailProvider>
    </RouterProvider>,
  );
}

describe("Direct Robi (018/016) Registration & Login + OTP API Alternative", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("identifies Robi/Airtel 018 and 016 prefixes on client helper", () => {
    expect(inspectRobiPhoneNumber("01812345678")).toMatchObject({
      validBdFormat: true,
      isRobiPrefix: true,
      prefix: "018",
    });
    expect(inspectRobiPhoneNumber("+88016 1234-5678")).toMatchObject({
      validBdFormat: true,
      isRobiPrefix: true,
      prefix: "016",
    });
    expect(inspectRobiPhoneNumber("01712345678")).toMatchObject({
      validBdFormat: true,
      isRobiPrefix: false,
      prefix: "017",
    });
    expect(inspectRobiPhoneNumber("01912345678")).toMatchObject({
      validBdFormat: true,
      isRobiPrefix: false,
      prefix: "019",
    });
  });

  it("allows 018 and 016 numbers to register and log in directly, grants +10 Welcome Tokens once, and rejects non-Robi prefixes", async () => {
    // Reject non-Robi operators (017, 019, 015, 013)
    for (const nonRobi of ["01711223344", "01911223344", "01511223344", "01311223344"]) {
      const rejectRes = await robiApi.handle(
        new Request("http://localhost/api/account/robi-direct", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ phoneNumber: nonRobi, intent: "register" }),
        }),
      );
      expect(rejectRes.status).toBe(400);
      const rejectJson = (await rejectRes.json()) as { code?: string };
      expect(rejectJson.code).toBe("ROBI_PREFIX_REQUIRED");
    }

    // Login before registration returns 404
    const missingLogin = await robiApi.handle(
      new Request("http://localhost/api/account/robi-direct", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phoneNumber: "01899887766", intent: "login" }),
      }),
    );
    expect(missingLogin.status).toBe(404);

    // Direct register with 018 number succeeds and grants +10 Welcome Tokens
    const regRes = await robiApi.handle(
      new Request("http://localhost/api/account/robi-direct", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phoneNumber: "01899887766",
          intent: "register",
          displayName: "Nadia Robi",
          localCompletedTrailIds: ["ctg-1"],
        }),
      }),
    );
    expect(regRes.status).toBe(200);
    const regJson = (await regRes.json()) as {
      verified: boolean;
      authMethod: string;
      token: string;
      welcomeGrantedNow: boolean;
      wallet: { balance: number };
      account: { displayName: string; completedTrailIds: string[] };
    };
    expect(regJson.verified).toBe(true);
    expect(regJson.authMethod).toBe("robi_direct");
    expect(regJson.welcomeGrantedNow).toBe(true);
    expect(regJson.wallet.balance).toBe(10);
    expect(regJson.account.displayName).toBe("Nadia Robi");
    expect(regJson.account.completedTrailIds).toContain("ctg-1");

    // Bearer token works on protected /api/account/me
    const meRes = await robiApi.handle(
      new Request("http://localhost/api/account/me", {
        headers: { Authorization: `Bearer ${regJson.token}` },
      }),
    );
    expect(meRes.status).toBe(200);

    // Direct login on existing 018 account preserves balance without duplicating +10 tokens
    const loginRes = await robiApi.handle(
      new Request("http://localhost/api/account/robi-direct", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phoneNumber: "01899887766", intent: "login" }),
      }),
    );
    expect(loginRes.status).toBe(200);
    const loginJson = (await loginRes.json()) as {
      verified: boolean;
      welcomeGrantedNow: boolean;
      wallet: { balance: number };
      account: { displayName: string };
    };
    expect(loginJson.verified).toBe(true);
    expect(loginJson.welcomeGrantedNow).toBe(false);
    expect(loginJson.wallet.balance).toBe(10);
    expect(loginJson.account.displayName).toBe("Nadia Robi");

    // Direct register with 016 Airtel/Robi number also works
    const airtelRes = await robiApi.handle(
      new Request("http://localhost/api/account/robi-direct", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phoneNumber: "+8801611223344",
          intent: "register",
          displayName: "Tariq Airtel",
        }),
      }),
    );
    expect(airtelRes.status).toBe(200);
    const airtelJson = (await airtelRes.json()) as {
      welcomeGrantedNow: boolean;
      wallet: { balance: number };
    };
    expect(airtelJson.welcomeGrantedNow).toBe(true);
    expect(airtelJson.wallet.balance).toBe(10);
  });

  it("keeps the existing OTP API workflow functioning as an alternative", async () => {
    const eligRes = await robiApi.handle(
      new Request("http://localhost/api/bdapps/eligibility", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phoneNumber: "01712345678" }),
      }),
    );
    expect(eligRes.status).toBe(200);

    const otpReqRes = await robiApi.handle(
      new Request("http://localhost/api/bdapps/otp/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phoneNumber: "01712345678", intent: "register" }),
      }),
    );
    expect(otpReqRes.status).toBe(200);
    const otpReqJson = (await otpReqRes.json()) as {
      referenceNo: string;
      previewOnlyOtp?: string;
    };
    expect(otpReqJson.previewOnlyOtp).toMatch(/^\d{6}$/);

    const verifyRes = await robiApi.handle(
      new Request("http://localhost/api/bdapps/otp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          referenceNo: otpReqJson.referenceNo,
          otp: otpReqJson.previewOnlyOtp,
          intent: "register",
          displayName: "OTP Alternative User",
        }),
      }),
    );
    expect(verifyRes.status).toBe(200);
    const verifyJson = (await verifyRes.json()) as {
      verified: boolean;
      wallet: { balance: number };
    };
    expect(verifyJson.verified).toBe(true);
    expect(verifyJson.wallet.balance).toBe(10);
  });

  it("renders direct 018/016 primary form and collapsible OTP alternative on AccountPage", () => {
    renderWithProviders(<AccountPage />);

    expect(
      screen.getByRole("button", { name: /Create Robi Account \(\+10 Tokens\)/i }),
    ).toBeInTheDocument();

    const phoneInput = screen.getByPlaceholderText(/018XXXXXXXX or 016XXXXXXXX/i);
    fireEvent.change(phoneInput, { target: { value: "01711000000" } });
    expect(screen.getByText(/Prefix 017 is not Robi\/Airtel/i)).toBeInTheDocument();

    fireEvent.change(phoneInput, { target: { value: "01811000000" } });
    expect(screen.getByText(/Robi\/Airtel prefix \(018\) verified/i)).toBeInTheDocument();

    // OTP alternative is collapsed initially and expands on click
    expect(
      screen.queryByRole("button", { name: /1\. Check Eligibility/i }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Alternative: Verify with SMS OTP API/i }));
    expect(screen.getByRole("button", { name: /1\. Check Eligibility/i })).toBeInTheDocument();

    // Switching to Log In tab switches primary CTA to direct Robi login
    fireEvent.click(screen.getByRole("tab", { name: /Log In with Mobile/i }));
    expect(screen.getByRole("button", { name: /Log In with Robi Number/i })).toBeInTheDocument();
  });
});
