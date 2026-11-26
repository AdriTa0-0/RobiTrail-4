import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

let mockLang: "en" | "bn" = "en";

vi.mock("@/robi/context/RobiTrailContext", () => ({
  useRobiTrail: () => ({
    lang: mockLang,
    completedTrailIds: ["ctg-1", "ctg-2", "ctg-3"],
    getCityProgress: () => ({ completed: 3, total: 4 }),
    accountProfile: { displayName: "Arpita" },
    signedIn: false,
    registerIssuedCertificate: vi.fn(),
    refreshAccountFromServer: vi.fn(),
  }),
}));

import { CertificationSection } from "@/robi/components/certification/CertificationSection";

describe("CertificationSection", () => {
  beforeEach(() => {
    mockLang = "en";
  });

  it("removes the amber BDapps Tech Quest disclaimer banner above the assessment", () => {
    render(<CertificationSection />);

    expect(
      screen.queryByText(/issued for learning demonstration, not an official credential/i),
    ).not.toBeInTheDocument();
  });

  it("shows an inline wrong-answer popup below the question and turns the bullet green on the correct option", () => {
    render(<CertificationSection />);

    const wrongOption = screen.getByLabelText("Directly from phone to phone without towers");
    fireEvent.click(wrongOption);

    const popup = screen.getByTestId("wrong-popup-q1");
    expect(popup).toHaveAttribute("role", "alert");
    expect(popup).toHaveTextContent(/Wrong answer/i);

    const wrongBullet = screen.getByTestId("radio-bullet-q1-direct_phone");
    expect(wrongBullet).toHaveAttribute("data-state", "wrong");

    const correctOption = screen.getByLabelText(
      "Phone → Local Tower → Core Switching Hub → Receiver Tower → Phone",
    );
    fireEvent.click(correctOption);

    expect(screen.queryByTestId("wrong-popup-q1")).not.toBeInTheDocument();

    const greenBullet = screen.getByTestId("radio-bullet-q1-tower_core_tower");
    expect(greenBullet).toHaveAttribute("data-state", "correct");
    expect(greenBullet.className).toContain("border-emerald-600");
    expect(greenBullet.querySelector("span")?.className).toContain("bg-emerald-600");
  });

  it("renders Bengali wrong-answer feedback when language is set to bn", () => {
    mockLang = "bn";
    render(<CertificationSection />);

    const wrongOption = screen.getByLabelText("এটি ৫ গুণ বেশি মোবাইল ডেটা খরচ করে");
    fireEvent.click(wrongOption);

    const popup = screen.getByTestId("wrong-popup-q2");
    expect(popup).toHaveTextContent(/ভুল উত্তর/);
  });
});
