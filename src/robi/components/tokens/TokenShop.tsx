import React, { useEffect, useState } from "react";
import { useRobiTrail } from "../../context/RobiTrailContext";
import { useAppRouter } from "../../router/RouterContext";
import { TOKEN_PACKAGES, type TokenPackage } from "../../services/tokens/TokenTransactionService";
import {
  fetchTokenShopPackages,
  requestTokenCheckoutOtp,
  verifyTokenCheckoutOtp,
  type TokenShopPackagesResponse,
} from "../../services/tokens/TokenShopService";
import { TokenEmblem } from "./TokenEmblem";
import { AlertTriangle, CheckCircle2, Clock, KeyRound, RefreshCw, ShieldCheck, ShoppingBag, Smartphone, UserPlus, X } from "lucide-react";

type CheckoutStep = "phone" | "otp" | "payment";
type ShopFeedback = { kind: "confirmed" | "pending" | "error"; message: string };

function normalizePhone(input: string): string | null {
  const raw = input.trim().replace(/[\s()-]/g, "");
  const digits = raw.replace(/^\+/, "");
  const match = digits.match(/^(?:88)?(01[3-9]\d{8})$/);
  return match ? `88${match[1]}` : null;
}

export const TokenShop: React.FC<{ onPurchaseComplete?: () => void }> = ({ onPurchaseComplete }) => {
  const { lang, signedIn, tokenBusy, purchaseTokensFromShop, checkShopOrderStatus } = useRobiTrail();
  const { navigate } = useAppRouter();
  const bn = lang === "bn";
  const [packages, setPackages] = useState<TokenPackage[]>([...TOKEN_PACKAGES]);
  const [capabilities, setCapabilities] = useState<TokenShopPackagesResponse | null>(null);
  const [pkg, setPkg] = useState<TokenPackage | null>(null);
  const [step, setStep] = useState<CheckoutStep>("phone");
  const [phone, setPhone] = useState("");
  const [maskedNumber, setMaskedNumber] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [otp, setOtp] = useState("");
  const [providerConsent, setProviderConsent] = useState(false);
  const [chargeConsent, setChargeConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<ShopFeedback | null>(null);
  const [pendingOrder, setPendingOrder] = useState<{ externalTrxId: string; pkg: TokenPackage } | null>(null);

  useEffect(() => {
    let active = true;
    fetchTokenShopPackages().then((data) => {
      if (!active) return;
      setCapabilities(data);
      if (data.packages?.length) setPackages(data.packages);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!pkg) return undefined;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy && !tokenBusy) setPkg(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pkg, busy, tokenBusy]);

  const openCheckout = (selected: TokenPackage) => {
    setPkg(selected);
    setStep("phone"); setPhone(""); setOtp(""); setReferenceNo("");
    setMaskedNumber(""); setProviderConsent(false); setChargeConsent(false);
    setError(""); setFeedback(null);
  };

  const sendOtp = async () => {
    if (!pkg || !normalizePhone(phone) || !providerConsent ||
        !capabilities?.freeSubscriptionVerifyReady || busy) return;
    setError(""); setBusy(true);
    try {
      // Server checks the number against the current authenticated account.
      const result = await requestTokenCheckoutOtp(phone);
      setReferenceNo(result.referenceNo);
      setMaskedNumber(result.maskedNumber);
      setStep("otp");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to send OTP."); }
    finally { setBusy(false); }
  };

  const verifyOtp = async () => {
    // Free subscription activation requires real terms and consent, not CaaS payment approval.
    if (!providerConsent || !capabilities?.freeSubscriptionVerifyReady ||
        !capabilities.subscriptionTermsText.trim()) {
      setError("Subscription verification requires the actual free-plan terms and your consent.");
      return;
    }
    if (!referenceNo || !/^\d{4,8}$/.test(otp) || busy) return;
    setError(""); setBusy(true);
    try {
      const result = await verifyTokenCheckoutOtp(referenceNo, otp);
      if (!result.verified) {
        setError(result.notice || "bdapps did not verify this OTP.");
        return;
      }
      setOtp(""); // Do not retain OTP after verification.
      if (result.subscriptionActive) {
        setFeedback({ kind: "confirmed", message: bn
          ? "RobiTrail সাবস্ক্রিপশন সফল হয়েছে! টোকেন কেনার পেমেন্ট আলাদা এবং এখনো বন্ধ।"
          : "Welcome to RobiTrail! Your subscription is active. Token purchase is separate and remains unavailable until CaaS approval." });
      } else {
        setFeedback({ kind: "pending", message: result.notice || "OTP verified. Waiting for bdapps to confirm the subscription; no tokens have been purchased." });
      }
      setPkg(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to verify OTP."); }
    finally { setBusy(false); }
  };

  const pay = async () => {
    if (!pkg || !chargeConsent || busy || tokenBusy) return;
    setError(""); setBusy(true);
    const selected = pkg;
    try {
      const result = await purchaseTokensFromShop(selected.packageId);
      if (!result.ok) {
        setError(result.error || "Carrier charge was not accepted. No tokens credited.");
        return;
      }
      if (result.pendingConfirmation) {
        if (result.externalTrxId) setPendingOrder({ externalTrxId: result.externalTrxId, pkg: selected });
        setFeedback({ kind: "pending", message: result.notice || "Awaiting verified bdapps CaaS confirmation. Do not pay twice." });
      } else {
        setFeedback({ kind: "confirmed", message: bn
          ? `ক্রয় নিশ্চিত: +${selected.tokens}টি টোকেন ওয়ালেটে যোগ হয়েছে।`
          : `Payment confirmed: +${selected.tokens} tokens added to your wallet.` });
        onPurchaseComplete?.();
      }
      setPkg(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Payment status unknown. Do not retry."); }
    finally { setBusy(false); }
  };

  const checkOrder = async () => {
    if (!pendingOrder || busy || tokenBusy) return;
    setBusy(true);
    try {
      const result = await checkShopOrderStatus(pendingOrder.externalTrxId);
      if (result.ok && !result.pendingConfirmation) {
        setFeedback({ kind: "confirmed", message: bn
          ? `পেমেন্ট নিশ্চিত: +${pendingOrder.pkg.tokens}টি টোকেন যুক্ত হয়েছে।`
          : `Payment confirmed: +${pendingOrder.pkg.tokens} tokens credited.` });
        setPendingOrder(null); onPurchaseComplete?.();
      } else if (result.ok) {
        setFeedback({ kind: "pending", message: result.notice || "Carrier confirmation pending. Do not pay again." });
      } else {
        setFeedback({ kind: "error", message: result.error || "Payment was rejected." });
        setPendingOrder(null);
      }
    } catch (err) { setFeedback({ kind: "pending", message: err instanceof Error ? err.message : "Status unavailable. Do not pay again." }); }
    finally { setBusy(false); }
  };

  return (
    <section aria-labelledby="token-store-heading" className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-7 space-y-6 shadow-sm">
      <div className="border-b border-slate-100 pb-5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-700 uppercase tracking-wider"><ShoppingBag className="w-4 h-4" />{bn ? "টোকেন স্টোর" : "Token Store"}</div>
        <h2 id="token-store-heading" className="text-xl font-extrabold text-slate-950">{bn ? "টোকেন প্যাকেজ কিনুন" : "Buy Token Packages"}</h2>
        <p className="text-sm text-slate-600">{bn
          ? "রবি bdapps-এর OTP দিয়ে নম্বর যাচাই করুন; তারপর এককালীন CaaS mobile-balance payment নিশ্চিত করুন। পেমেন্ট নিশ্চিত হলে টোকেন যোগ হবে।"
          : "Verify your number with bdapps OTP, then separately confirm a one-time mobile-balance payment through CaaS. Tokens arrive after payment confirmation."}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map((item) => (
          <div key={item.packageId} className="rounded-2xl bg-[#FAF8F5] border border-slate-200 hover:border-rose-300 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2"><TokenEmblem size="md"/><span className="font-extrabold text-lg">{item.tokens} {bn ? "টোকেন" : "Tokens"}</span></div>
              <span className="font-extrabold text-rose-700 text-xl">৳{item.priceBdt}</span>
            </div>
            <p className="text-xs text-slate-600 flex items-center gap-2"><Smartphone className="w-4 h-4 text-rose-600"/> {bn ? "এককালীন mobile-balance payment" : "One-time mobile-balance payment"}</p>
            <button type="button" onClick={() => openCheckout(item)} className="min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm cursor-pointer">{bn ? "এখনই কিনুন" : "Buy Now"}</button>
          </div>
        ))}
      </div>

      {feedback && (
        <div role="status" className={`rounded-xl border p-4 text-sm ${feedback.kind === "confirmed" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : feedback.kind === "pending" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}>
          <div className="flex flex-wrap justify-between items-start gap-3">
            <span className="flex gap-2 items-start">{feedback.kind === "confirmed" ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5"/> : feedback.kind === "pending" ? <Clock className="w-4 h-4 shrink-0 mt-0.5"/> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5"/>}{feedback.message}</span>
            {pendingOrder && <button type="button" disabled={busy || tokenBusy} onClick={() => void checkOrder()} className="inline-flex items-center gap-2 rounded-lg bg-amber-700 px-3 py-2 text-xs text-white disabled:opacity-50"><RefreshCw className="w-4 h-4"/>{bn ? "পেমেন্ট স্ট্যাটাস দেখুন" : "Check Payment Status"}</button>}
          </div>
        </div>
      )}

      {pkg && (
        <div role="dialog" aria-modal="true" aria-labelledby="checkout-heading" className="fixed inset-0 z-[74] flex items-center justify-center bg-slate-950/75 p-4" onClick={() => { if (!busy && !tokenBusy) setPkg(null); }}>
          <div className="relative max-w-md w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5 shadow-2xl" onClick={(e)=>e.stopPropagation()}>
            <button type="button" aria-label={bn ? "বন্ধ করুন" : "Close"} disabled={busy || tokenBusy} onClick={() => setPkg(null)} className="absolute right-4 top-4 p-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50"><X className="w-4 h-4"/></button>
            <div className="pr-8 space-y-1"><p className="text-xs uppercase tracking-wider text-rose-700 font-bold">{bn ? "রবি মোবাইল ব্যালেন্স" : "Robi Mobile Balance"}</p><h3 id="checkout-heading" className="text-xl font-extrabold text-slate-950">{pkg.tokens} {bn ? "টোকেন" : "Tokens"} · ৳{pkg.priceBdt}</h3><p className="text-xs text-slate-600">{bn ? "১. নম্বর → ২. OTP → ৩. পেমেন্ট" : "1. Phone → 2. OTP → 3. Payment"}</p></div>

            {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">{error}</div>}
            {!signedIn ? <div className="space-y-4"><p className="text-sm text-slate-700">{bn ? "টোকেন ওয়ালেটে রাখার জন্য প্রথমে অ্যাকাউন্টে লগ-ইন করো।" : "Sign in to your RobiTrail account to receive tokens."}</p><button type="button" onClick={()=>{setPkg(null);navigate("/account");}} className="w-full min-h-[44px] rounded-xl bg-rose-600 text-white font-bold flex justify-center items-center gap-2"><UserPlus className="w-4 h-4"/>{bn ? "অ্যাকাউন্টে যাও" : "Go to Account"}</button></div> : (
              <>
                {!capabilities?.otpRequestReady && <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0"/><span>{capabilities?.otpBlockedReason || (bn ? "bdapps subscription OTP gateway প্রস্তুত নয়।" : "bdapps subscription OTP gateway is unavailable.")}</span></div>}
                {capabilities?.otpRequestReady && !capabilities?.freeSubscriptionVerifyReady && <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0"/><span>{bn ? "Free subscription-এর প্রকৃত terms configure করা না হওয়া পর্যন্ত OTP verification বন্ধ থাকবে।" : "OTP verification needs the actual free-subscription terms configured first. Payment remains separate."}</span></div>}
                {step === "phone" && <div className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-800" htmlFor="token-checkout-phone">{bn ? "রবি/এয়ারটেল মোবাইল নম্বর" : "Robi/Airtel mobile number"}</label>
                  <input id="token-checkout-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="018XXXXXXXX" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-950 focus:outline-none focus:border-rose-500"/>
                  <p className="text-xs text-slate-600">{bn ? "অ্যাকাউন্টের একই নম্বর দিতে হবে। অন্য নম্বরের জন্য সেই অ্যাকাউন্টে লগ-ইন করো।" : "Use the same number as your signed-in account. Sign into a different account to use another number."}</p>
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-950 space-y-2">
                    <p className="font-bold">{bn ? "bdapps সাবস্ক্রিপশন সম্পর্কে জরুরি তথ্য" : "Important bdapps subscription information"}</p>
                    <p>{bn ? "bdapps OTP verification-এ subscription activate হতে পারে। এটি token pack-এর এককালীন CaaS charge থেকে আলাদা।" : "bdapps OTP verification may activate a subscription, separate from the one-time CaaS token-pack charge."}</p>
                    <p className="whitespace-pre-wrap">{capabilities?.subscriptionTermsText || (bn ? "অনুমোদিত subscription terms এখনো configure করা হয়নি।" : "Approved subscription terms are not configured yet.")}</p>
                    <label className="flex gap-2 items-start cursor-pointer"><input type="checkbox" className="mt-0.5 accent-rose-600" checked={providerConsent} onChange={e=>setProviderConsent(e.target.checked)}/><span>{bn ? "আমি উপরের free-subscription terms মেনে নিচ্ছি এবং OTP verify করার পর subscription চালু করতে সম্মতি দিচ্ছি। Token payment আলাদা।" : "I accept the free-subscription terms above and consent to activation after OTP verification. Token purchases are separate."}</span></label>
                  </div>
                  <button type="button" disabled={!capabilities?.freeSubscriptionVerifyReady || !normalizePhone(phone) || !providerConsent || busy} onClick={()=>void sendOtp()} className="min-h-[44px] w-full bg-rose-600 hover:bg-rose-500 disabled:bg-slate-300 text-white font-bold rounded-xl flex justify-center items-center gap-2"><Smartphone className="w-4 h-4"/>{busy ? (bn ? "পাঠানো হচ্ছে..." : "Sending...") : (bn ? "bdapps OTP পাঠাও" : "Send bdapps OTP")}</button>
                </div>}
                {step === "otp" && <div className="space-y-4">
                  <p className="text-sm text-slate-700">{bn ? `bdapps ${maskedNumber} নম্বরে OTP পাঠানোর অনুরোধ গ্রহণ করেছে।` : `bdapps accepted the OTP request for ${maskedNumber}.`}</p>
                  <label htmlFor="token-checkout-otp" className="block text-sm font-semibold">{bn ? "SMS-এ পাওয়া OTP" : "OTP from SMS"}</label>
                  <input id="token-checkout-otp" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))} type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" className="w-full rounded-xl border border-slate-300 p-3 text-center tracking-[0.5em] text-xl font-bold text-slate-950"/>
                  <p className="text-xs text-amber-800">{bn ? "OTP verify করলে free subscription চালু হতে পারে। Token কেনার CaaS payment আলাদা এবং এখনো বন্ধ।" : "Verifying this OTP may activate the free subscription. Separate CaaS token payments remain unavailable."}</p>
                  <button type="button" disabled={!capabilities?.freeSubscriptionVerifyReady || !providerConsent || !/^\d{4,8}$/.test(otp) || busy} onClick={()=>void verifyOtp()} className="w-full min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-300 text-white font-bold flex justify-center items-center gap-2"><KeyRound className="w-4 h-4"/>{busy ? (bn ? "যাচাই চলছে..." : "Verifying...") : (bn ? "bdapps OTP যাচাই করো" : "Verify bdapps OTP")}</button>
                </div>}
                {step === "payment" && <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4"/>{bn ? "bdapps OTP যাচাই সফল" : "bdapps OTP verified"}</div>
                  <div className="p-4 rounded-xl bg-[#FAF8F5] border border-slate-200 space-y-3 text-sm">
                    <div className="flex justify-between"><span>{bn ? "টোকেন" : "Tokens"}</span><strong>+{pkg.tokens}</strong></div>
                    <div className="flex justify-between border-t border-slate-200 pt-3"><span>{bn ? "মোবাইল ব্যালেন্স থেকে একবার কাটবে" : "One-time mobile-balance debit"}</span><strong className="text-rose-700">৳{pkg.priceBdt}</strong></div>
                    <div className="text-xs text-slate-600">{bn ? "পেমেন্ট সফলভাবে নিশ্চিত হওয়ার আগে টোকেন যোগ হবে না।" : "Tokens are not credited until payment is verified."}</div>
                  </div>
                  <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer"><input type="checkbox" checked={chargeConsent} onChange={e=>setChargeConsent(e.target.checked)} className="mt-0.5 accent-rose-600"/><span>{bn ? `আমি আমার মোবাইল ব্যালেন্স থেকে একবার ৳${pkg.priceBdt} কাটার অনুমতি দিচ্ছি।` : `I authorize a one-time deduction of ৳${pkg.priceBdt} from my mobile balance.`}</span></label>
                  <button type="button" disabled={!chargeConsent || busy || tokenBusy} onClick={()=>void pay()} className="w-full min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-300 text-white font-bold flex items-center justify-center gap-2"><ShoppingBag className="w-4 h-4"/>{(busy || tokenBusy) ? (bn ? "পেমেন্ট প্রক্রিয়াধীন..." : "Processing payment...") : (bn ? `৳${pkg.priceBdt} পে করে ${pkg.tokens} টোকেন নাও` : `Pay ৳${pkg.priceBdt} for ${pkg.tokens} Tokens`)}</button>
                </div>}
              </>
            )}
            <button type="button" disabled={busy || tokenBusy} onClick={()=>setPkg(null)} className="w-full py-2 text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50">{bn ? "বন্ধ করুন" : "Close"}</button>
          </div>
        </div>
      )}
    </section>
  );
};
