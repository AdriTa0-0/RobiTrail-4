import React, { useEffect } from "react";
import { useRobiTrail } from "../../context/RobiTrailContext";
import { useAppRouter } from "../../router/RouterContext";
import { ExploreCitiesSection } from "../world/ExploreCitiesSection";
import { CITIES } from "../../data/cities/cities";
import { t } from "../../data/translations/dictionary";
import { ArrowLeft, Gamepad2 } from "lucide-react";

export const CitiesPage: React.FC<{ routeCityId?: "chattogram" | "dhaka" | "sylhet" }> = ({
  routeCityId,
}) => {
  const { lang, activeCity, setActiveCityId } = useRobiTrail();
  const { navigate } = useAppRouter();

  useEffect(() => {
    if (routeCityId && routeCityId !== activeCity.id) {
      setActiveCityId(routeCityId);
    }
  }, [routeCityId, activeCity.id, setActiveCityId]);

  return (
    <div className="bg-[#FAF8F5] min-h-[82vh]">
      {/* Breadcrumb & Quick City Route Switcher */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-950"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{lang === "en" ? "Back to 3D World" : "৩ডি বিশ্বে ফিরুন"}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {CITIES.map((city) => {
            const isCurrent = (routeCityId || activeCity.id) === city.id;
            return (
              <button
                key={city.id}
                type="button"
                onClick={() => {
                  setActiveCityId(city.id);
                  navigate(`/cities/${city.id}`);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  isCurrent
                    ? "bg-rose-600 text-white border-rose-600"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                }`}
              >
                {t(city.name, lang)}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => navigate("/games")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-amber-300" />
            <span>{lang === "en" ? "All Games" : "সকল গেম"}</span>
          </button>
        </div>
      </div>

      {/* Dedicated Multi-City Map & Playable Trails Launcher */}
      <ExploreCitiesSection
        onEnterCityView={() => {
          navigate(`/games/${routeCityId || activeCity.id}`);
        }}
      />
    </div>
  );
};
