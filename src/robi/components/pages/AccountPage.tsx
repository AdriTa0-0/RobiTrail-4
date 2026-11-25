import React, { useEffect, useState } from "react";
import { useRobiTrail } from "../../context/RobiTrailContext";
import { useAppRouter } from "../../router/RouterContext";
import { CITIES } from "../../data/cities/cities";
import { TRAILS } from "../../data/trails/trails";
import { t } from "../../data/translations/dictionary";
import { AnimatedTokenCount, TokenEmblem } from "../tokens/TokenEmblem";
import {
  checkOperatorEligibility,
  directRobiAuth,
  inspectRobiPhoneNumber,
  requestBdappsOtp,
  verifyBdappsOtp,
  type EligibilityResponse,
  type OtpRequestResponse,
} from "../../services/bdapps/bdappsClient";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Gamepad2,
  KeyRound,
  LogOut,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Unlock,
  UserCheck,
  Download,
} from "lucide-react";

type OnboardingIntent = "register" | "login";

export const AccountPage: React.FC = () => {
  const {
    lang,
    signedIn,
    accountProfile,
    authBusy,
    authError,
    completedTrailIds,
    localCertificateIds,
    activeCity,
    getCityProgress,
    applyVerifiedSession,
    signOutAccount,
    updateDisplayName,
    deleteAccountAndData,
    tokenWallet,
  } = useRobiTrail();
  const { navigate } = useAppRouter();

  // Onboarding state (Direct Robi 018/016 primary + optional SMS OTP alternative)
  const [intent, setIntent] = useState<OnboardingIntent>("register");
  const [phoneInput, setPhoneInput] = useState("");
  const [playerNameInput, setPlayerNameInput] = useState("");
  const [showOtpAlternative, setShowOtpAlternative] = useState(false);
  const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
  const [otpReq, setOtpReq] = useState<OtpRequestResponse | null>(null);
  const [otpRemainingSec, setOtpRemainingSec] = useState(0);
  const [otpCodeInput, setOtpCodeInput] = useState("");
  const [flowBusy, setFlowBusy] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [flowNotice, setFlowNotice] = useState<string | null>(null);

  // Authenticated management state
  const [nameEditInput, setNameEditInput] = useState(accountProfile?.displayName || "");
  const [nameSavedNotice, setNameSavedNotice] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    if (accountProfile?.displayName) {
      setNameEditInput(accountProfile.displayName);
    }
  }, [accountProfile?.displayName]);

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (!otpReq) {
      setOtpRemainingSec(0);
      return undefined;
    }
    setOtpRemainingSec(otpReq.expiresInSeconds);
    const id = window.setInterval(() => {
      setOtpRemainingSec((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [otpReq]);

  const phoneCheck = inspectRobiPhoneNumber(phoneInput);

  const resetOnboardingSteps = (nextIntent: OnboardingIntent) => {
    setIntent(nextIntent);
    setEligibility(null);
    setOtpReq(null);
    setOtpCodeInput("");
    setFlowError(null);
    setFlowNotice(null);
  };

  const handleDirectRobiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFlowError(null);
    setFlowNotice(null);

    if (!phoneCheck.validBdFormat) {
      setFlowError(
        lang === "en"
          ? "Enter a valid 11-digit Bangladesh mobile number (e.g. 018XXXXXXXX or 016XXXXXXXX)."
          : "সঠিক ১১-অঙ্কের মোবাইল নম্বর দিন (যেমন: 018XXXXXXXX বা 016XXXXXXXX)।",
      );
      return;
    }

    if (!phoneCheck.isRobiPrefix) {
      setFlowError(
        lang === "en"
          ? "Direct registration and login is only for Robi/Airtel numbers starting with 018 or 016. Use the SMS OTP alternative below for other operators."
          : "সরাসরি রেজিস্ট্রেশন ও লগ-ইন শুধুমাত্র ০১৮ বা ০১৬ দিয়ে শুরু রবি/এয়ারটেল নম্বরের জন্য প্রযোজ্য। অন্য অপারেটরের জন্য নিচের এসএমএস ওটিপি বিকল্প ব্যবহার করুন।",
      );
      return;
    }

    setFlowBusy(true);
    try {
      const res = await directRobiAuth(phoneInput, {
        intent,
        displayName: intent === "register" ? playerNameInput.trim() || undefined : undefined,
        localCompletedTrailIds: completedTrailIds,
        localCertificateIds,
        preferredLang: lang,
        preferredCityId: activeCity.id,
      });

      applyVerifiedSession(res.account, res.subscription, res.wallet, {
        welcomeGrantedNow: res.welcomeGrantedNow,
        smsPreview: res.smsPreview,
        persistenceBackend: res.persistenceBackend,
      });
      setOtpReq(null);
      setEligibility(null);
      setFlowNotice(
        intent === "login"
          ? lang === "en"
            ? "Welcome back! Your Robi account is signed in and progress is synced."
            : "স্বাগতম! আপনার রবি অ্যাকাউন্ট লগ-ইন হয়েছে এবং অগ্রগতি যুক্ত রয়েছে।"
          : res.welcomeGrantedNow
            ? lang === "en"
              ? "Robi account registered! +10 Welcome Tokens have been credited and local progress is synced."
              : "রবি অ্যাকাউন্ট তৈরি হয়েছে! +১০টি স্বাগতম টোকেন যুক্ত হয়েছে এবং অগ্রগতি সংরক্ষিত হয়েছে।"
            : lang === "en"
              ? "Signed into your existing Robi account! Local progress has been synced."
              : "আপনার বিদ্যমান রবি অ্যাকাউন্টে লগ-ইন সম্পন্ন হয়েছে এবং অগ্রগতি যুক্ত হয়েছে।",
      );
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "Robi registration/login failed.");
    } finally {
      setFlowBusy(false);
    }
  };

  const handleCheckEligibility = async (e: React.FormEvent) => {
    e.preventDefault();
    setFlowError(null);
    setFlowNotice(null);
    setFlowBusy(true);
    try {
      const res = await checkOperatorEligibility(phoneInput);
      setEligibility(res);
      setOtpReq(null);
      setOtpCodeInput("");
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "Unable to check mobile eligibility.");
    } finally {
      setFlowBusy(false);
    }
  };

  const handleRequestOtp = async () => {
    setFlowError(null);
    setFlowNotice(null);
    setFlowBusy(true);
    try {
      const res = await requestBdappsOtp(phoneInput, { intent });
      setOtpReq(res);
      setOtpCodeInput("");
      setFlowNotice(res.notice || null);
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "Unable to request OTP.");
    } finally {
      setFlowBusy(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpReq) return;
    setFlowError(null);
    setFlowNotice(null);
    setFlowBusy(true);
    try {
      const res = await verifyBdappsOtp(otpReq.referenceNo, otpCodeInput, {
        intent,
        displayName: playerNameInput.trim() || undefined,
        localCompletedTrailIds: completedTrailIds,
        localCertificateIds,
        preferredLang: lang,
        preferredCityId: activeCity.id,
      });

      applyVerifiedSession(res.account, res.subscription, res.wallet, {
        welcomeGrantedNow: res.welcomeGrantedNow,
        smsPreview: res.smsPreview,
        persistenceBackend: res.persistenceBackend,
      });
      setOtpReq(null);
      setEligibility(null);
      setFlowNotice(
        lang === "en"
          ? "Mobile verified! Your RobiTrail account is signed in and local progress has been synced."
          : "মোবাইল যাচাই সম্পন্ন! আপনার রবিট্রেইল অ্যাকাউন্ট চালু হয়েছে এবং অগ্রগতি যুক্ত হয়েছে।",
      );
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setFlowBusy(false);
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setFlowError(null);
    setNameSavedNotice(false);
    try {
      await updateDisplayName(nameEditInput);
      setNameSavedNotice(true);
      window.setTimeout(() => setNameSavedNotice(false), 3000);
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "Unable to save player name.");
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") return;
    setFlowError(null);
    try {
      await deleteAccountAndData();
      setShowDeleteModal(false);
      setDeleteConfirmText("");
      resetOnboardingSteps("register");
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "Failed to delete account.");
    }
  };

  const handleDownloadSavedCert = (cert: {
    certificateId: string;
    learnerName: string;
    completedTrailIds: string[];
    scorePercent: number;
    issuedAt: string;
  }) => {
    const safeName = cert.learnerName.replace(/[<>&"]/g, "");
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="620" viewBox="0 0 900 620">
  <rect width="900" height="620" fill="#FAF8F5"/>
  <rect x="24" y="24" width="852" height="572" fill="none" stroke="#9F1239" stroke-width="4"/>
  <rect x="36" y="36" width="828" height="548" fill="none" stroke="#D6CEBE" stroke-width="1.5"/>
  <text x="450" y="96" text-anchor="middle" font-family="sans-serif" font-size="14" letter-spacing="4" fill="#9F1239">ROBITRAIL · BDAPPS TECH QUEST</text>
  <text x="450" y="152" text-anchor="middle" font-family="serif" font-size="38" font-weight="bold" fill="#111827">Certificate of Completion</text>
  <text x="450" y="210" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#4B5563">Awarded to</text>
  <text x="450" y="268" text-anchor="middle" font-family="serif" font-size="34" font-weight="bold" fill="#111827">${safeName}</text>
  <line x1="220" y1="286" x2="680" y2="286" stroke="#D1D5DB" stroke-width="2"/>
  <text x="450" y="336" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#374151">For completing ${cert.completedTrailIds.length} interactive trails and scoring ${cert.scorePercent}% on the Telecom Literacy Assessment.</text>
  <text x="450" y="406" text-anchor="middle" font-family="monospace" font-size="13" fill="#6B7280">ID: ${cert.certificateId} | Date: ${cert.issuedAt.slice(0, 10)}</text>
  <text x="450" y="534" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9F1239">Educational app created for BDapps Tech Quest — Learning demonstration credential.</text>
</svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RobiTrail-Certificate-${cert.certificateId}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const unlockedGamesCount = tokenWallet?.totalUnlockedGames ?? 0;

  return (
    <div className="bg-[#FAF8F5] min-h-screen py-8 sm:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Account Page Header */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-mono font-bold text-rose-700 uppercase tracking-wider mb-1">
              {lang === "en" ? "Player Profile & Progress" : "খেলোয়াড় প্রোফাইল ও অগ্রগতি"}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 font-display text-balance">
              {lang === "en" ? "Robi Mobile Account" : "রবি মোবাইল অ্যাকাউন্ট"}
            </h1>
            <p className="text-sm text-slate-700 mt-1.5 max-w-2xl leading-relaxed">
              {lang === "en"
                ? "Create an account or log in directly with your Robi/Airtel mobile number (018 or 016) to claim +10 Welcome Tokens, or use the SMS OTP option as an alternative. Your mission progress, badges, and certificates stay synced here."
                : "রবি/এয়ারটেল মোবাইল নম্বর (০১৮ বা ০১৬) দিয়ে সরাসরি অ্যাকাউন্ট তৈরি বা লগ-ইন করে +১০টি স্বাগতম টোকেন পান, অথবা বিকল্প হিসেবে এসএমএস ওটিপি ব্যবহার করুন। আপনার মিশন অগ্রগতি, ব্যাজ ও সনদপত্র এখানে সংরক্ষিত থাকে।"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/games")}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <Gamepad2 className="w-4 h-4 text-rose-400" />
            <span>{lang === "en" ? "Play Games" : "গেম খেলুন"}</span>
          </button>
        </header>

        {(authError || flowError) && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
            <span>{flowError || authError}</span>
          </div>
        )}

        {flowNotice && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>{flowNotice}</span>
          </div>
        )}

        {/* Unauthenticated Onboarding vs Authenticated Profile Hub */}
        {!signedIn ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-8 space-y-6 shadow-sm">
            {/* Flow Selector Tabs (Create Account / Log In only) */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div
                className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200"
                role="tablist"
                aria-label="Account Action"
              >
                {[
                  { id: "register" as const, en: "Create Account", bn: "অ্যাকাউন্ট তৈরি" },
                  { id: "login" as const, en: "Log In with Mobile", bn: "মোবাইলে লগ-ইন" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={intent === tab.id}
                    onClick={() => resetOnboardingSteps(tab.id)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      intent === tab.id
                        ? "bg-rose-600 text-white shadow-sm"
                        : "text-slate-700 hover:bg-white hover:text-slate-950"
                    }`}
                  >
                    {lang === "en" ? tab.en : tab.bn}
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-600 font-mono-num">
                {lang === "en"
                  ? `Guest progress ready to sync: ${completedTrailIds.length}/${TRAILS.length} missions`
                  : `সিঙ্কের জন্য প্রস্তুত অগ্রগতি: ${completedTrailIds.length}/${TRAILS.length}টি মিশন`}
              </div>
            </div>

            {/* Primary Direct Robi (018 / 016) Registration & Login */}
            <div className="space-y-4">
              <form
                onSubmit={handleDirectRobiSubmit}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start"
              >
                {intent !== "login" && (
                  <div className="md:col-span-4 space-y-1">
                    <label
                      htmlFor="robi-player-name"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      {lang === "en" ? "Your Name (Optional)" : "আপনার নাম (ঐচ্ছিক)"}
                    </label>
                    <input
                      id="robi-player-name"
                      type="text"
                      maxLength={60}
                      value={playerNameInput}
                      onChange={(e) => setPlayerNameInput(e.target.value)}
                      placeholder={lang === "en" ? "e.g. Ayesha Rahman" : "যেমন: আয়েশা রহমান"}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                )}

                <div
                  className={
                    intent !== "login" ? "md:col-span-5 space-y-1" : "md:col-span-8 space-y-1"
                  }
                >
                  <label
                    htmlFor="robi-phone-input"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    {lang === "en"
                      ? "Robi / Airtel Mobile Number (018 or 016)"
                      : "রবি / এয়ারটেল মোবাইল নম্বর (০১৮ বা ০১৬)"}
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="robi-phone-input"
                      type="tel"
                      required
                      value={phoneInput}
                      onChange={(e) => {
                        setPhoneInput(e.target.value);
                        if (flowError) setFlowError(null);
                      }}
                      placeholder="018XXXXXXXX or 016XXXXXXXX"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-num text-slate-900 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  {/* Live Robi/Airtel Prefix Guidance */}
                  <div className="min-h-[18px] text-[11px] leading-snug pt-0.5">
                    {!phoneInput.trim() ? (
                      <span className="text-slate-500">
                        {lang === "en"
                          ? "Enter an 11-digit Robi (018) or Airtel (016) number."
                          : "১১-অঙ্কের রবি (০১৮) অথবা এয়ারটেল (০১৬) নম্বর লিখুন।"}
                      </span>
                    ) : phoneCheck.isRobiPrefix ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {lang === "en"
                            ? `Robi/Airtel prefix (${phoneCheck.prefix}) verified for direct ${intent === "login" ? "login" : "registration"}.`
                            : `রবি/এয়ারটেল প্রিফিক্স (${phoneCheck.prefix}) সরাসরি ${intent === "login" ? "লগ-ইন" : "রেজিস্ট্রেশনের"} জন্য উপযুক্ত।`}
                        </span>
                      </span>
                    ) : phoneCheck.prefix &&
                      phoneCheck.prefix !== "018" &&
                      phoneCheck.prefix !== "016" ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {lang === "en"
                            ? `Prefix ${phoneCheck.prefix} is not Robi/Airtel (018/016). Use a 018 or 016 number, or try the OTP option below.`
                            : `${phoneCheck.prefix} নম্বরটি রবি/এয়ারটেল (০১৮/০১৬) নয়। ০১৮ বা ০১৬ নম্বর দিন অথবা নিচের ওটিপি বিকল্প দেখুন।`}
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-600">
                        {lang === "en"
                          ? "Continue typing 11 digits starting with 018 or 016."
                          : "০১৮ বা ০১৬ দিয়ে শুরু ১১-অঙ্কের নম্বর সম্পূর্ণ করুন।"}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className={
                    intent !== "login" ? "md:col-span-3 md:pt-[22px]" : "md:col-span-4 md:pt-[22px]"
                  }
                >
                  <button
                    type="submit"
                    disabled={flowBusy || !phoneInput.trim()}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-300 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
                  >
                    {flowBusy
                      ? lang === "en"
                        ? "Please wait..."
                        : "অপেক্ষা করুন..."
                      : intent === "login"
                        ? lang === "en"
                          ? "Log In with Robi Number"
                          : "রবি নম্বরে লগ-ইন করুন"
                        : lang === "en"
                          ? "Create Robi Account (+10 Tokens)"
                          : "রবি অ্যাকাউন্ট তৈরি (+১০ টোকেন)"}
                  </button>
                </div>
              </form>
            </div>

            {/* Optional Alternative: SMS OTP API Workflow */}
            <div className="border-t border-slate-100 pt-4 space-y-4">
              <button
                type="button"
                aria-expanded={showOtpAlternative}
                onClick={() => setShowOtpAlternative((prev) => !prev)}
                className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <KeyRound className="w-4 h-4 text-slate-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {lang === "en"
                        ? "Alternative: Verify with SMS OTP API"
                        : "বিকল্প: এসএমএস ওটিপি এপিআই দিয়ে যাচাই করুন"}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {lang === "en"
                        ? "Optional carrier OTP verification flow (if SMS OTP API is active)"
                        : "ঐচ্ছিক মোবাইল ওটিপি যাচাইকরণ প্রক্রিয়া (ওটিপি এপিআই সক্রিয় থাকলে)"}
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
                  <span>
                    {showOtpAlternative
                      ? lang === "en"
                        ? "Hide OTP Option"
                        : "লুকান"
                      : lang === "en"
                        ? "Open OTP Option"
                        : "ওটিপি বিকল্প খুলুন"}
                  </span>
                  {showOtpAlternative ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </span>
              </button>

              {showOtpAlternative && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-5">
                  <form
                    onSubmit={handleCheckEligibility}
                    className="flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="text-xs text-slate-700">
                      {lang === "en"
                        ? `Using mobile number: ${phoneInput.trim() || "(enter number above)"}`
                        : `নির্বাচিত মোবাইল নম্বর: ${phoneInput.trim() || "(উপরে নম্বর লিখুন)"}`}
                    </div>
                    <button
                      type="submit"
                      disabled={flowBusy || !phoneInput.trim()}
                      className="min-h-[40px] py-2 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      {flowBusy && !eligibility
                        ? lang === "en"
                          ? "Checking..."
                          : "যাচাই হচ্ছে..."
                        : lang === "en"
                          ? "1. Check Eligibility"
                          : "১. নম্বর যাচাই করুন"}
                    </button>
                  </form>

                  {/* Step 2: Provider Eligibility Result & OTP */}
                  {eligibility && (
                    <div className="space-y-5 pt-3 border-t border-slate-200">
                      <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 font-mono font-bold text-slate-900">
                          <span>
                            {eligibility.maskedNumber} · {eligibility.mode.toUpperCase()} MODE
                          </span>
                          <span className="text-rose-700">
                            {eligibility.accountExists
                              ? lang === "en"
                                ? "Existing Account Found"
                                : "অ্যাকাউন্ট পাওয়া গেছে"
                              : lang === "en"
                                ? "New Mobile Profile"
                                : "নতুন মোবাইল প্রোফাইল"}
                          </span>
                        </div>
                        {eligibility.limitationNote && (
                          <p className="text-slate-600 leading-relaxed">
                            {eligibility.limitationNote}
                          </p>
                        )}
                      </div>

                      {/* Step 3: Send & Verify OTP */}
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={handleRequestOtp}
                            disabled={flowBusy}
                            className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-300 text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-4 h-4" />
                            <span>
                              {otpReq
                                ? lang === "en"
                                  ? "Resend Verification OTP"
                                  : "পুনরায় ওটিপি পাঠান"
                                : lang === "en"
                                  ? "2. Send Verification OTP"
                                  : "২. ওটিপি কোড পাঠান"}
                            </span>
                          </button>

                          {otpReq && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-mono-num text-slate-600">
                              <Clock className="w-3.5 h-3.5 text-rose-600" />
                              <span>
                                {otpRemainingSec > 0
                                  ? `${lang === "en" ? "Expires in" : "মেয়াদ"} ${formatTimer(otpRemainingSec)}`
                                  : lang === "en"
                                    ? "OTP expired — request a new code"
                                    : "মেয়াদ শেষ — নতুন কোড নিন"}
                              </span>
                            </span>
                          )}
                        </div>

                        {otpReq && (
                          <form
                            onSubmit={handleVerifyOtp}
                            className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 space-y-4"
                          >
                            {otpReq.previewOnlyOtp && (
                              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2">
                                <span>
                                  {lang === "en"
                                    ? "Preview Mode Verification Code (no real SMS sent):"
                                    : "প্রিভিউ মোড যাচাইকরণ কোড (আসল এসএমএস পাঠানো হয়নি):"}
                                </span>
                                <strong className="font-mono-num text-base tracking-widest text-rose-700">
                                  {otpReq.previewOnlyOtp}
                                </strong>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-3">
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                required
                                value={otpCodeInput}
                                onChange={(e) => setOtpCodeInput(e.target.value.replace(/\D/g, ""))}
                                placeholder={
                                  lang === "en" ? "Enter 6-digit OTP" : "৬-অঙ্কের ওটিপি লিখুন"
                                }
                                className="flex-1 min-w-[180px] px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-num tracking-widest bg-white text-slate-900 focus:outline-none focus:border-rose-500"
                              />
                              <button
                                type="submit"
                                disabled={
                                  flowBusy || otpCodeInput.length < 6 || otpRemainingSec === 0
                                }
                                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold transition-colors cursor-pointer"
                              >
                                {flowBusy
                                  ? lang === "en"
                                    ? "Verifying..."
                                    : "যাচাই হচ্ছে..."
                                  : lang === "en"
                                    ? "Verify OTP"
                                    : "ওটিপি যাচাই করুন"}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Authenticated Player Profile Card */
          <div className="space-y-6">
            <div
              id="account-settings-card"
              className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-8 space-y-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
                    {(accountProfile?.displayName || "R").charAt(0).toUpperCase()}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-950">
                        {accountProfile?.displayName}
                      </h2>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{lang === "en" ? "Mobile Verified" : "মোবাইল যাচাইকৃত"}</span>
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-mono-num">
                      {accountProfile?.maskedPhone} · {accountProfile?.accountId}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={authBusy}
                    onClick={signOutAccount}
                    className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{lang === "en" ? "Log Out" : "লগ আউট"}</span>
                  </button>
                  <button
                    type="button"
                    disabled={authBusy}
                    onClick={() => setShowDeleteModal(true)}
                    className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{lang === "en" ? "Delete Account" : "অ্যাকাউন্ট মুছুন"}</span>
                  </button>
                </div>
              </div>

              {/* Editable Player Display Name */}
              <form onSubmit={handleSaveName} className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[220px]">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {lang === "en"
                      ? "Player Display Name (Max 60 characters)"
                      : "খেলোয়াড়ের নাম (সর্বোচ্চ ৬০ অক্ষর)"}
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    required
                    value={nameEditInput}
                    onChange={(e) => setNameEditInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authBusy || !nameEditInput.trim()}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{lang === "en" ? "Save Name" : "নাম সংরক্ষণ"}</span>
                </button>
                {nameSavedNotice && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 py-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{lang === "en" ? "Saved!" : "সংরক্ষিত!"}</span>
                  </span>
                )}
              </form>
            </div>

            {/* Compact Token Balance Summary (Links to Dedicated /tokens Token Center) */}
            <div className="rounded-2xl bg-white border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <TokenEmblem size="md" />
                <div>
                  <div className="text-xs font-semibold text-slate-600">
                    {lang === "bn" ? "টোকেন ব্যালেন্স সারসংক্ষেপ" : "Token Balance Summary"}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base font-extrabold text-slate-950 font-mono-num">
                    <span>
                      <AnimatedTokenCount value={tokenWallet?.balance ?? 0} />{" "}
                      {lang === "bn" ? "টোকেন" : "Tokens"}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span className="text-xs font-semibold text-slate-600 inline-flex items-center gap-1">
                      <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                      {lang === "bn"
                        ? `${unlockedGamesCount}টি গেম আনলকড`
                        : `${unlockedGamesCount} Unlocked Games`}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/tokens")}
                className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <span>{lang === "bn" ? "টোকেন সেন্টার খুলুন" : "Open Token Center"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* City-Wise Mission Progress & Total Missions Stats (inside Account) */}
        <section aria-labelledby="account-progress-heading" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="account-progress-heading" className="text-lg font-bold text-slate-950">
              {lang === "en" ? "Mission Progress Summary" : "শহরভিত্তিক মিশন অগ্রগতি"}
            </h2>
            <div className="text-xs font-mono-num text-slate-600">
              {lang === "bn"
                ? `সম্পন্ন: ${completedTrailIds.length}/${TRAILS.length} · আনলকড গেম: ${unlockedGamesCount}`
                : `Completed: ${completedTrailIds.length}/${TRAILS.length} · Unlocked Games: ${unlockedGamesCount}`}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {CITIES.map((city) => {
              const p = getCityProgress(city.id);
              const pct = Math.round((p.completed / Math.max(1, p.total)) * 100);
              return (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => navigate(`/games/${city.id}`)}
                  className="text-left p-4 rounded-xl bg-white border border-slate-200 hover:border-rose-300 transition-colors cursor-pointer space-y-2"
                >
                  <div className="text-xs font-mono text-slate-600">{t(city.name, lang)}</div>
                  <div className="text-2xl font-mono-num font-extrabold text-slate-950">
                    {p.completed}/{p.total}
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-rose-600 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-slate-600">{t(city.achievement.title, lang)}</div>
                </button>
              );
            })}

            <div className="p-4 rounded-xl bg-slate-950 text-white border border-slate-800 space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono text-amber-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{lang === "en" ? "TOTAL MISSIONS" : "মোট মিশন"}</span>
              </div>
              <div className="text-2xl font-mono-num font-extrabold">
                {completedTrailIds.length}/{TRAILS.length}
              </div>
              <div className="text-xs text-slate-300 font-mono-num">
                {lang === "bn"
                  ? `আনলকড গেম: ${unlockedGamesCount}টি · টোকেন: ${tokenWallet?.balance ?? 0}`
                  : `Unlocked: ${unlockedGamesCount} · Tokens: ${tokenWallet?.balance ?? 0}`}
              </div>
            </div>
          </div>
        </section>

        {/* Achievements & Saved Certificates */}
        {signedIn && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>{lang === "en" ? "Unlocked Achievements" : "অর্জিত ব্যাজ ও কৃতিত্ব"}</span>
              </div>

              {accountProfile && accountProfile.achievements.length > 0 ? (
                <div className="space-y-2.5">
                  {accountProfile.achievements.map((ach) => (
                    <div
                      key={ach.id}
                      className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-950">
                          {lang === "en" ? ach.titleEn : ach.titleBn}
                        </div>
                        <div className="text-[11px] font-mono-num text-amber-800">
                          {ach.unlockedAt.slice(0, 10)}
                        </div>
                      </div>
                      <Award className="w-5 h-5 text-amber-600 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {lang === "en"
                    ? "Complete all trails in Chattogram, Dhaka, or Sylhet to unlock city mastery badges saved to your account."
                    : "চট্টগ্রাম, ঢাকা বা সিলেটের সব মিশন সম্পন্ন করলে শহরভিত্তিক মাস্টারি ব্যাজ আপনার অ্যাকাউন্টে যুক্ত হবে।"}
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
                  <Award className="w-4 h-4 text-rose-600" />
                  <span>{lang === "en" ? "Saved Certificates" : "সংরক্ষিত সনদপত্র"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/certification")}
                  className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                >
                  {lang === "en" ? "Open Assessment" : "পরীক্ষা পাতা"}
                </button>
              </div>

              {accountProfile && accountProfile.certificates.length > 0 ? (
                <div className="space-y-2.5">
                  {accountProfile.certificates.map((cert) => (
                    <div
                      key={cert.certificateId}
                      className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-emerald-950 truncate">
                          {cert.learnerName} · {cert.scorePercent}%
                        </div>
                        <div className="text-[11px] font-mono-num text-emerald-800 truncate">
                          {cert.certificateId} · {cert.issuedAt.slice(0, 10)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadSavedCert(cert)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>SVG</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {lang === "en"
                    ? "Pass the Certification quiz after completing 3+ trails to permanently link your certificate here."
                    : "৩টির বেশি মিশন শেষে মূল্যায়ন পরীক্ষায় উত্তীর্ণ হলে আপনার সনদপত্র এখানে স্থায়ীভাবে যুক্ত থাকবে।"}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2-Step Account Deletion Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[75] bg-slate-950/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-md w-full rounded-2xl bg-white border border-rose-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-950">
                  {lang === "en" ? "Permanently Delete Account?" : "অ্যাকাউন্ট স্থায়ীভাবে মুছে ফেলবেন?"}
                </h3>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  {lang === "en"
                    ? "This will permanently erase your server-backed RobiTrail profile, token wallet, and saved progress. This action cannot be undone."
                    : "এটি আপনার সার্ভার প্রোফাইল, টোকেন ওয়ালেট ও সংরক্ষিত গেম অগ্রগতি স্থায়ীভাবে মুছে দেবে। এটি আর ফিরিয়ে আনা যাবে না।"}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === "en" ? "Type DELETE to confirm:" : "নিশ্চিত করতে DELETE লিখুন:"}
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono text-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer"
              >
                {lang === "en" ? "Cancel" : "বাতিল"}
              </button>
              <button
                type="button"
                disabled={authBusy || deleteConfirmText.trim().toUpperCase() !== "DELETE"}
                onClick={() => void handleConfirmDelete()}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:bg-slate-300 text-white text-xs font-semibold cursor-pointer"
              >
                {authBusy
                  ? lang === "en"
                    ? "Deleting..."
                    : "মুছে ফেলা হচ্ছে..."
                  : lang === "en"
                    ? "Delete Permanently"
                    : "স্থায়ীভাবে মুছুন"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
