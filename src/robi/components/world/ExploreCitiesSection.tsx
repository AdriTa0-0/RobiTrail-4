import React, { useEffect, useState } from "react";
import { CITIES, FUTURE_CITY_EXPANSIONS, type CityConfig } from "../../data/cities/cities";
import { TRAILS, getTrailsForCity } from "../../data/trails/trails";
import { useRobiTrail } from "../../context/RobiTrailContext";
import { t, UI_DICT } from "../../data/translations/dictionary";
import { TrailSymbol } from "../game/TrailSymbol";
import { Award, CheckCircle2, Lock, MapPin, ArrowUpRight, Layers, Play } from "lucide-react";

export const ExploreCitiesSection: React.FC<{ onEnterCityView: () => void }> = ({
  onEnterCityView,
}) => {
  const {
    lang,
    activeCity,
    setActiveCityId,
    completedTrailIds,
    openTrail,
    getCityProgress,
    devTestingMode,
    tokenPreviewMode,
    getTrailAccess,
  } = useRobiTrail();

  const [selectedCityId, setSelectedCityId] = useState<CityConfig["id"]>(activeCity.id);

  useEffect(() => {
    setSelectedCityId(activeCity.id);
  }, [activeCity.id]);

  const handleSelectCity = (cityId: CityConfig["id"]) => {
    setSelectedCityId(cityId);
    setActiveCityId(cityId);
  };

  const previewCity = CITIES.find((c) => c.id === selectedCityId) || CITIES[0];
  const cityTrails = getTrailsForCity(previewCity.id);
  const progress = getCityProgress(previewCity.id);

  const handleEnterCity = () => {
    setActiveCityId(previewCity.id);
    onEnterCityView();
  };

  return (
    <section
      id="explore-cities"
      className="max-w-6xl mx-auto px-4 sm:px-6 py-14 border-t border-slate-200"
    >
      <div className="max-w-2xl mb-8">
        <div className="text-xs font-mono text-rose-600 uppercase tracking-wider mb-1">
          {t(UI_DICT.cities.sectionTitle, lang)}
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-balance">
          {lang === "en"
            ? "Three Distinct Bangladeshi Environments"
            : "বাংলাদেশের তিনটি অনন্য শহরের পরিবেশ"}
        </h2>
        <p className="text-sm sm:text-base text-slate-600 mt-2">
          {t(UI_DICT.cities.sectionSubtitle, lang)}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Interactive Geographic Bangladesh Map Selector */}
        <div className="lg:col-span-5 rounded-2xl bg-slate-950 text-white p-5 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-slate-300">
              {lang === "en" ? "BANGLADESH NETWORK CORRIDOR" : "বাংলাদেশ নেটওয়ার্ক করিডোর"}
            </span>
            <span className="text-xs font-mono text-amber-300 tabular-nums">
              {TRAILS.length} {lang === "en" ? "Trails" : "টি ট্রেইল"}
            </span>
          </div>

          <div className="relative flex-1 flex items-center justify-center py-2">
            <div className="relative w-full max-w-[380px] rounded-xl overflow-hidden shadow-inner ring-1 ring-white/10">
              <img
                src="/assets/Bangladesh_map.jpeg"
                alt={
                  lang === "en"
                    ? "Map of Bangladesh highlighting Dhaka, Chattogram, and Sylhet"
                    : "ঢাকা, চট্টগ্রাম ও সিলেট চিহ্নিত বাংলাদেশের মানচিত্র"
                }
                className="w-full h-auto block select-none"
              />
              {(
                [
                  {
                    id: "sylhet",
                    style: { left: "64%", top: "28.5%", width: "24%", height: "10%" },
                  },
                  {
                    id: "dhaka",
                    style: { left: "27.5%", top: "43.5%", width: "23%", height: "10%" },
                  },
                  {
                    id: "chattogram",
                    style: { left: "49%", top: "57.5%", width: "24.5%", height: "10.5%" },
                  },
                ] as const
              ).map(({ id, style }) => {
                const city = CITIES.find((c) => c.id === id);
                if (!city) return null;
                const isSelected = city.id === previewCity.id;
                const cityProg = getCityProgress(city.id);
                return (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleSelectCity(city.id)}
                    style={style}
                    aria-label={`${t(city.name, lang)} (${cityProg.completed}/${cityProg.total})`}
                    aria-pressed={isSelected}
                    title={`${t(city.name, lang)} — ${cityProg.completed}/${cityProg.total}`}
                    className={`absolute rounded-xl cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                      isSelected
                        ? "ring-2 ring-amber-300 bg-white/10 shadow-[0_0_0_2px_rgba(15,23,42,0.35)]"
                        : "hover:bg-white/10 hover:ring-1 hover:ring-white/60"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            {previewCity.sourceAttribution}
          </div>
        </div>

        {/* Right: Cinematic City Preview & Playable Trails List */}
        <div className="lg:col-span-7 rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 flex flex-col justify-between shadow-sm">
          <div>
            {/* City Banner Preview */}
            <div
              className="rounded-xl p-5 text-white relative overflow-hidden mb-5"
              style={{
                background: `linear-gradient(135deg, ${previewCity.theme.skyTop}, ${previewCity.theme.skyBottom})`,
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-white/85 font-mono">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{t(previewCity.regionLabel, lang)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{previewCity.coordinates.display}</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold mt-1">
                    {t(previewCity.name, lang)}
                  </h3>
                  <p className="text-sm text-white/90 mt-1.5 max-w-xl">
                    {t(previewCity.description, lang)}
                  </p>
                </div>

                {/* City Achievement Artwork Emblem */}
                <div className="rounded-xl bg-slate-950/55 border border-white/20 px-3.5 py-2.5 text-center shrink-0">
                  <Award
                    className={`w-6 h-6 mx-auto mb-1 ${
                      progress.completed === progress.total ? "text-amber-300" : "text-white/60"
                    }`}
                  />
                  <div className="text-[11px] font-semibold">
                    {t(previewCity.achievement.title, lang)}
                  </div>
                  <div className="text-[10px] font-mono-num text-white/80">
                    {progress.completed}/{progress.total} {t(UI_DICT.cities.completed, lang)}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/20 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-white/85 max-w-md">
                  {t(previewCity.geographyNotes, lang)}
                </p>
                <button
                  onClick={handleEnterCity}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-slate-950 hover:bg-slate-100 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shadow-sm cursor-pointer"
                >
                  <span>{t(UI_DICT.cities.enterCity, lang)}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Playable Trails List for Selected City */}
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-900">
                {t(previewCity.name, lang)} — {cityTrails.length}{" "}
                {t(UI_DICT.cities.trailsCount, lang)}
              </h4>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono-num">
                {devTestingMode && !tokenPreviewMode && (
                  <span className="text-[11px] font-sans font-medium text-sky-700">
                    {lang === "en" ? "Dev Mode Unlocked ·" : "ডেভ মোড আনলকড ·"}
                  </span>
                )}
                <span>
                  {progress.completed}/{progress.total}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {cityTrails.map((trail) => {
                const done = completedTrailIds.includes(trail.id);
                const access = getTrailAccess(trail);
                const gated = !access.accessible;
                return (
                  <button
                    key={trail.id}
                    type="button"
                    onClick={() => openTrail(trail.id)}
                    className={`group flex items-start gap-3 p-3 rounded-xl border text-left transition-all hover:shadow-sm cursor-pointer ${
                      done
                        ? "bg-emerald-50/70 border-emerald-200 hover:border-emerald-300"
                        : "bg-slate-50 border-slate-200 hover:border-rose-300 hover:bg-white"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        done
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-white text-rose-600 border border-slate-200"
                      }`}
                    >
                      <TrailSymbol type={trail.iconType} className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-slate-400 tabular-nums">
                          #{trail.order}
                        </span>
                        {done && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                        {!done && gated && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 shrink-0">
                            <Lock className="w-3 h-3" />
                            <span>
                              {access.requiresTokenUnlock
                                ? `${access.unlockCost}T`
                                : lang === "bn"
                                  ? "অ্যাকাউন্ট"
                                  : "Sign Up"}
                            </span>
                          </span>
                        )}
                        {!done && !gated && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 group-hover:text-rose-700 shrink-0">
                            <Play className="w-3 h-3" />
                            <span>
                              {access.tier === "free_intro"
                                ? lang === "bn"
                                  ? "ফ্রি"
                                  : "Free"
                                : lang === "en"
                                  ? "Play Game"
                                  : "গেম খেলুন"}
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {t(trail.title, lang)}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {t(trail.subtitle, lang)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expandable City Architecture Notice */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium text-slate-700">
                {t(UI_DICT.cities.futureHeading, lang)}:
              </span>
              <span>{FUTURE_CITY_EXPANSIONS.map((f) => t(f.name, lang)).join(" · ")}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
