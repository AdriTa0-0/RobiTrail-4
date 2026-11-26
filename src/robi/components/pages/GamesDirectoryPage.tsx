import React, { useState } from "react";
import { useRobiTrail } from "../../context/RobiTrailContext";
import { useAppRouter } from "../../router/RouterContext";
import { CITIES, getCityById } from "../../data/cities/cities";
import { TRAILS, getTrailsForCity } from "../../data/trails/trails";
import { t } from "../../data/translations/dictionary";
import { TrailSymbol } from "../game/TrailSymbol";
import { TokenEmblem } from "../tokens/TokenEmblem";
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, Gamepad2, Unlock } from "lucide-react";

export const GamesDirectoryPage: React.FC<{
  routeCityId?: "chattogram" | "dhaka" | "sylhet";
}> = ({ routeCityId }) => {
  const {
    lang,
    completedTrailIds,
    devTestingMode,
    tokenPreviewMode,
    setTokenPreviewMode,
    getTrailAccess,
    openTrail,
  } = useRobiTrail();
  const { navigate } = useAppRouter();
  const [filterCity, setFilterCity] = useState<"all" | "chattogram" | "dhaka" | "sylhet">(
    routeCityId || "dhaka",
  );

  React.useEffect(() => {
    setFilterCity(routeCityId || "dhaka");
  }, [routeCityId]);

  const handleFilterChange = (next: "all" | "chattogram" | "dhaka" | "sylhet") => {
    setFilterCity(next);
    navigate(next === "all" ? "/games" : `/games/${next}`);
  };

  const visibleTrails = filterCity === "all" ? TRAILS : getTrailsForCity(filterCity);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8 min-h-[82vh]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-950 mb-3 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{lang === "en" ? "Back to Home" : "হোমে ফিরুন"}</span>
          </button>
          <div className="flex items-center gap-2 text-xs font-mono text-rose-700 uppercase tracking-wider">
            <Gamepad2 className="w-4 h-4" />
            <span>{lang === "en" ? "Interactive Missions" : "ইন্টারেক্টিভ মিশনসমূহ"}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-950 mt-1 font-display">
            {filterCity === "all"
              ? lang === "en"
                ? `All ${TRAILS.length} Telecom Trails`
                : `সকল ${TRAILS.length}টি টেলিকম মিশন`
              : `${t(getCityById(filterCity).name, lang)} — ${
                  lang === "en" ? "City Missions" : "শহরের মিশনসমূহ"
                }`}
          </h1>
          {devTestingMode && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-900 bg-sky-50 border border-sky-200 rounded-lg px-3 py-1.5">
                <Unlock className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                <span>
                  {tokenPreviewMode
                    ? lang === "en"
                      ? "Token Preview Active — test guest invite, 2-token unlocks & wallet flow."
                      : "টোকেন প্রিভিউ চালু — অ্যাকাউন্ট ও ২-টোকেন আনলক ধাপ পরীক্ষা করুন।"
                    : lang === "en"
                      ? `Dev Testing Mode — all ${TRAILS.length} missions playable without altering saved progress.`
                      : `ডেভেলপমেন্ট টেস্টিং মোড — সব ${TRAILS.length}টি গেম সরাসরি খেলা যাবে।`}
                </span>
              </p>
              <button
                type="button"
                onClick={() => setTokenPreviewMode(!tokenPreviewMode)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  tokenPreviewMode
                    ? "bg-rose-600 text-white border-rose-600"
                    : "bg-white text-slate-800 border-slate-300 hover:border-rose-400"
                }`}
              >
                <TokenEmblem size="xs" />
                <span>
                  {tokenPreviewMode
                    ? lang === "en"
                      ? "Return to Dev Open"
                      : "ডেভ ওপেনে ফিরুন"
                    : lang === "en"
                      ? "Preview Token Locks"
                      : "টোকেন লক প্রিভিউ"}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* City Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleFilterChange("all")}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              filterCity === "all"
                ? "bg-slate-950 text-white border-slate-950"
                : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
            }`}
          >
            {lang === "en" ? `All Cities (${TRAILS.length})` : `সকল শহর (${TRAILS.length})`}
          </button>
          {CITIES.map((city) => (
            <button
              key={city.id}
              type="button"
              onClick={() => handleFilterChange(city.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                filterCity === city.id
                  ? "bg-rose-600 text-white border-rose-600"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
              }`}
            >
              {t(city.name, lang)} ({getTrailsForCity(city.id).length})
            </button>
          ))}
        </div>
      </div>

      {/* Mission Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleTrails.map((trail) => {
          const city = getCityById(trail.cityId);
          const done = completedTrailIds.includes(trail.id);
          const access = getTrailAccess(trail);
          const locked = !access.accessible;

          return (
            <div
              key={trail.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition-shadow hover:shadow-md ${
                done ? "bg-emerald-50/50 border-emerald-200" : "bg-white border-slate-200"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                    <span>#{trail.order}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-rose-600 font-semibold">{t(city.name, lang)}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {access.tier === "free_intro" && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                        {lang === "bn" ? "চিরদিন ফ্রি" : "Free Forever"}
                      </span>
                    )}
                    {access.tier !== "free_intro" && access.requiresTokenUnlock && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold font-mono-num">
                        <TokenEmblem size="xs" />
                        <span>
                          {access.unlockCost} {lang === "bn" ? "টোকেন" : "Tokens"}
                        </span>
                      </span>
                    )}
                    {access.tier !== "free_intro" && access.requiresRegistration && (
                      <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                        {lang === "bn" ? "অ্যাকাউন্ট প্রয়োজন" : "Account Gate"}
                      </span>
                    )}
                    {access.tier === "token_locked" && access.alreadyUnlockedByPlayer && !done && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                        {lang === "bn" ? "আনলকড" : "Unlocked"}
                      </span>
                    )}
                    {done && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    {!done && locked && <Lock className="w-4 h-4 text-amber-600" />}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-100 text-rose-600 shrink-0">
                    <TrailSymbol type={trail.iconType} className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{t(trail.title, lang)}</h2>
                    <p className="text-xs text-slate-500">{t(trail.subtitle, lang)}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                  {t(trail.objective, lang)}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">
                  {trail.cityId === "chattogram" ? "3D Interactive" : "Simulation Lab"}
                </span>
                <button
                  type="button"
                  onClick={() => openTrail(trail.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white text-xs font-semibold transition-colors cursor-pointer ${
                    locked ? "bg-slate-900 hover:bg-slate-800" : "bg-rose-600 hover:bg-rose-500"
                  }`}
                >
                  <span>
                    {locked
                      ? access.requiresTokenUnlock
                        ? lang === "bn"
                          ? `আনলক (${access.unlockCost} টোকেন)`
                          : `Unlock (${access.unlockCost} Tokens)`
                        : lang === "bn"
                          ? "অ্যাকাউন্টে আনলক"
                          : "Sign Up to Play"
                      : lang === "en"
                        ? "Play Game"
                        : "গেম খেলুন"}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
