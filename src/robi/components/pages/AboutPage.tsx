import React, { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Award, Compass, Gamepad2, Laptop, PlayCircle, Smartphone, Tablet, X } from "lucide-react";
import { useAppRouter } from "../../router/RouterContext";
import { BangladeshMapBackdrop } from "../common/BangladeshMapBackdrop";
import { useRobiTrail } from "../../context/RobiTrailContext";

const DESKTOP_SCREENSHOT_SRC = "/assets/Screenshot_2026-11-22_114016_3e1a9428.png";
const MOBILE_TABLET_SCREENSHOT_SRC = "/assets/Screenshot_2026-11-22_114043_8c76968b.png";
const VISION_ILLUSTRATION_SRC =
  "/assets/ChatGPT_Image_Nov_22__2026__01_03_46_AM_bfccf95d.png";
const TEAM_TORONGO_PHOTO_SRC = "/assets/Team_Torongo_bc1561c9.jpg";

const ease = [0.22, 1, 0.36, 1] as const;

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children,
  delay = 0,
  className,
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 48 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.25 }}
    transition={{ duration: 0.8, ease, delay }}
  >
    {children}
  </motion.div>
);

const Pop: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children,
  delay = 0,
  className,
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, scale: 0.88, y: 30 }}
    whileInView={{ opacity: 1, scale: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.9, ease, delay }}
  >
    {children}
  </motion.div>
);

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-rose-600">
    {children}
  </div>
);

/* ---------- Device mockups showing real RobiTrail screens ---------- */
const LaptopFrame: React.FC<{ alt: string; onEnlarge: () => void }> = ({ alt, onEnlarge }) => (
  <button
    type="button"
    onClick={onEnlarge}
    aria-label={alt}
    className="w-full block text-left cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded-2xl"
  >
    <div className="rounded-t-2xl bg-slate-900 p-2 sm:p-3 shadow-2xl ring-1 ring-black/10">
      <img src={DESKTOP_SCREENSHOT_SRC} alt={alt} className="w-full h-auto block rounded-lg" />
    </div>
    <div className="mx-auto h-3 sm:h-4 w-[108%] -ml-[4%] rounded-b-2xl bg-gradient-to-b from-slate-300 to-slate-400 shadow-lg" />
  </button>
);

const TabletFrame: React.FC<{ alt: string; onEnlarge: () => void }> = ({ alt, onEnlarge }) => (
  <button
    type="button"
    onClick={onEnlarge}
    aria-label={alt}
    className="w-full block text-left cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded-[1.4rem]"
  >
    <div className="rounded-[1.4rem] bg-slate-900 p-2 shadow-2xl ring-1 ring-black/10">
      <img
        src={MOBILE_TABLET_SCREENSHOT_SRC}
        alt={alt}
        className="w-full h-auto block rounded-[0.9rem]"
      />
    </div>
  </button>
);

const PhoneFrame: React.FC<{ alt: string; onEnlarge: () => void }> = ({ alt, onEnlarge }) => (
  <button
    type="button"
    onClick={onEnlarge}
    aria-label={alt}
    className="w-full block text-left cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded-[1.3rem]"
  >
    <div className="rounded-[1.3rem] bg-slate-950 p-1.5 shadow-2xl ring-1 ring-black/10">
      <div className="relative">
        <img
          src={MOBILE_TABLET_SCREENSHOT_SRC}
          alt={alt}
          className="w-full h-auto block rounded-[0.85rem]"
        />
        <span className="absolute top-1/2 left-1.5 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-950/80" />
      </div>
    </div>
  </button>
);

/* ---------- Tool logos ---------- */
const TOOL_GROUPS: {
  title: string;
  titleBn: string;
  note: string;
  noteBn: string;
  tools: { name: string; slug?: string; color: string }[];
}[] = [
  {
    title: "Design & Planning",
    note: "Interface planning, visual composition and prototyping.",
    titleBn: "ডিজাইন ও পরিকল্পনা",
    noteBn: "ইন্টারফেস পরিকল্পনা, ভিজ্যুয়াল কম্পোজিশন ও প্রোটোটাইপিং।",
    tools: [
      { name: "Canva", slug: "canva", color: "#00C4CC" },
      { name: "Figma", slug: "figma", color: "#F24E1E" },
    ],
  },
  {
    title: "Development & Experience",
    note: "Interactive building, 3D city worlds and motion.",
    titleBn: "ডেভেলপমেন্ট ও অভিজ্ঞতা",
    noteBn: "ইন্টারঅ্যাকটিভ নির্মাণ, ৩ডি শহর ও অ্যানিমেশন।",
    tools: [
      { name: "Google AI Studio", slug: "googlegemini", color: "#4285F4" },
      { name: "React", slug: "react", color: "#61DAFB" },
      { name: "TypeScript", slug: "typescript", color: "#3178C6" },
      { name: "Three.js", slug: "threedotjs", color: "#111111" },
      { name: "GSAP", slug: "greensock", color: "#88CE02" },
    ],
  },
  {
    title: "Platform & Services",
    note: "Telecom subscription platform and backend support.",
    titleBn: "প্ল্যাটফর্ম ও সার্ভিস",
    noteBn: "টেলিকম সাবস্ক্রিপশন প্ল্যাটফর্ম ও ব্যাকএন্ড সাপোর্ট।",
    tools: [
      { name: "bdapps", color: "#E11D48" },
      { name: "Firebase", slug: "firebase", color: "#FFCA28" },
    ],
  },
];

const ToolLogo: React.FC<{ name: string; slug?: string; color: string }> = ({
  name,
  slug,
  color,
}) => {
  const [failed, setFailed] = useState(!slug);
  return (
    <div className="flex flex-col items-center gap-2 w-24">
      <div className="w-16 h-16 rounded-2xl bg-white shadow-md ring-1 ring-stone-200 flex items-center justify-center">
        {failed ? (
          <span className="font-display font-extrabold text-sm" style={{ color }}>
            {name === "bdapps" ? "bd" : name.slice(0, 2)}
            <span className="text-slate-900">{name === "bdapps" ? "apps" : ""}</span>
          </span>
        ) : (
          <img
            src={`https://cdn.simpleicons.org/${slug}`}
            alt={`${name} logo`}
            className="w-8 h-8"
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <span className="text-xs font-semibold text-slate-700 text-center leading-tight">{name}</span>
    </div>
  );
};

const FEATURES = [
  {
    icon: Gamepad2,
    title: "Play",
    titleBn: "খেলুন",
    textBn:
      "চট্টগ্রাম, ঢাকা ও সিলেটে শহরভিত্তিক ইন্টারঅ্যাকটিভ মিশন খেলে কাজের মাধ্যমে ডিজিটাল যোগাযোগের ধারণা শিখুন।",
    color: "from-rose-600 to-rose-500",
    text: "Play city-based interactive missions in Chattogram, Dhaka and Sylhet to learn digital communication concepts through task-based experiences.",
  },
  {
    icon: PlayCircle,
    title: "Watch",
    titleBn: "দেখুন",
    textBn:
      "ভয়েস ও সাবটাইটেলসহ অ্যানিমেটেড পাঠ ও টিউটোরিয়াল দেখে মোবাইল নেটওয়ার্ক, ডিজিটাল সার্ভিস ও যোগাযোগ ব্যবস্থা সহজে বুঝুন।",
    color: "from-amber-500 to-orange-500",
    text: "Watch animated lessons and tutorial content with voice and subtitles to understand mobile networks, digital services and communication systems more easily.",
  },
  {
    icon: Compass,
    title: "Explore",
    titleBn: "অনুসন্ধান করুন",
    textBn:
      "ইন্টারঅ্যাকটিভ পথ, টাইমলাইনের গল্প ও সাজানো অনুসন্ধানের মাধ্যমে রবির ঐতিহাসিক যাত্রা, টেলিকমের ধারণা ও ভিজ্যুয়াল ব্যাখ্যা ঘুরে দেখুন।",
    color: "from-emerald-600 to-teal-500",
    text: "Explore Robi’s historical journey, telecom concepts and guided visual explanations through interactive paths, timeline stories and structured discovery.",
  },
  {
    icon: Award,
    title: "Learn & Earn",
    titleBn: "শিখুন ও অর্জন করুন",
    textBn:
      "হ্যান্ডবুক ব্যবহার করুন, নির্দেশিত শিক্ষণ সম্পন্ন করুন এবং অ্যাপের ভেতরেই সার্টিফিকেটভিত্তিক স্বীকৃতির দিকে এগিয়ে যান।",
    color: "from-sky-600 to-indigo-500",
    text: "Use the handbook, complete guided learning experiences, and progress toward certificate-based recognition inside the app.",
  },
];

const TEAM = [
  { name: "Adrita Guha", role: "Developer", roleBn: "ডেভেলপার" },
  { name: "Arpita Nath", role: "UI/UX Designer", roleBn: "UI/UX ডিজাইনার" },
  { name: "Subha Mamun", role: "Research Lead", roleBn: "রিসার্চ লিড" },
];

export const AboutPage: React.FC = () => {
  const { navigate } = useAppRouter();
  const { lang } = useRobiTrail();
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);
  const { scrollYProgress } = useScroll();
  const heroShift = useTransform(scrollYProgress, [0, 0.25], [0, -60]);
  const [enlargedImage, setEnlargedImage] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    if (!enlargedImage) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEnlargedImage(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enlargedImage]);

  return (
    <div className={`relative overflow-x-clip ${bn ? "leading-relaxed" : ""}`}>
      <BangladeshMapBackdrop />
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-rose-600 origin-left z-50"
        style={{ scaleX: scrollYProgress }}
      />

      <div className="relative z-10">
        {/* 1. INTRO */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-20 sm:pb-28">
          <Reveal className="max-w-3xl space-y-4">
            <Eyebrow>{L("Our story · Who we are", "আমাদের গল্প · আমরা কারা")}</Eyebrow>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950 font-display">
              {bn ? (
                <>
                  বাংলাদেশের <span className="text-rose-600">সংযুক্ত ভবিষ্যতের</span> পথে এক ডিজিটাল
                  যাত্রা
                </>
              ) : (
                <>
                  A digital journey through Bangladesh’s{" "}
                  <span className="text-rose-600">connected future</span>
                </>
              )}
            </h1>
          </Reveal>
          <Reveal
            delay={0.1}
            className="max-w-3xl mt-5 space-y-4 text-slate-700 text-base sm:text-lg leading-relaxed"
          >
            <p>
              {L(
                "RobiTrail is an interactive educational app that helps users explore digital communication, telecom concepts, Robi’s journey, and real-world connectivity through playful city-based learning. It brings together game-based exploration, visual storytelling, animated lessons, and guided interaction in one engaging experience.",
                "RobiTrail একটি ইন্টারঅ্যাকটিভ শিক্ষামূলক অ্যাপ, যা মজার শহরভিত্তিক শেখার মাধ্যমে ব্যবহারকারীদের ডিজিটাল যোগাযোগ, টেলিকমের ধারণা, রবির পথচলা এবং বাস্তব জীবনের সংযোগ সম্পর্কে জানতে সাহায্য করে। গেমভিত্তিক অনুসন্ধান, ভিজ্যুয়াল গল্প বলা, অ্যানিমেটেড পাঠ এবং নির্দেশিত ইন্টারঅ্যাকশন — সবকিছু এক আকর্ষণীয় অভিজ্ঞতায় একত্র করা হয়েছে।",
              )}
            </p>
            <p className="text-base">
              {L(
                "Built for an educational and competition context, RobiTrail transforms difficult telecom and digital literacy concepts into a more accessible, enjoyable, and locally meaningful experience. Instead of presenting information as static lessons, the app lets users explore, interact, and learn through city missions, historical journeys, and hands-on explanations.",
                "শিক্ষা ও প্রতিযোগিতার উদ্দেশ্যে তৈরি RobiTrail কঠিন টেলিকম ও ডিজিটাল সাক্ষরতার ধারণাগুলোকে আরও সহজ, উপভোগ্য এবং স্থানীয়ভাবে অর্থবহ অভিজ্ঞতায় রূপ দেয়। স্থির পাঠের বদলে অ্যাপটি শহরের মিশন, ঐতিহাসিক যাত্রা এবং হাতে-কলমে ব্যাখ্যার মাধ্যমে ব্যবহারকারীদের অনুসন্ধান, অংশগ্রহণ ও শেখার সুযোগ দেয়।",
              )}
            </p>
          </Reveal>

          <motion.div
            style={{ y: heroShift }}
            className="relative mt-12 sm:mt-16 mx-auto max-w-5xl pb-12 sm:pb-8"
          >
            <Pop className="w-[78%] sm:w-[72%] mx-auto">
              <LaptopFrame
                alt={L(
                  "RobiTrail Dhaka 3D experience on desktop",
                  "ডেস্কটপে RobiTrail-এর ঢাকা ৩ডি অভিজ্ঞতা",
                )}
                onEnlarge={() =>
                  setEnlargedImage({
                    src: DESKTOP_SCREENSHOT_SRC,
                    alt: L(
                      "RobiTrail Dhaka 3D experience on desktop",
                      "ডেস্কটপে RobiTrail-এর ঢাকা ৩ডি অভিজ্ঞতা",
                    ),
                  })
                }
              />
            </Pop>
            <Pop delay={0.2} className="absolute left-0 bottom-0 w-[33%] sm:w-[28%]">
              <TabletFrame
                alt={L(
                  "RobiTrail Chattogram 3D experience on tablet",
                  "ট্যাবলেটে RobiTrail-এর চট্টগ্রাম ৩ডি অভিজ্ঞতা",
                )}
                onEnlarge={() =>
                  setEnlargedImage({
                    src: MOBILE_TABLET_SCREENSHOT_SRC,
                    alt: L(
                      "RobiTrail Chattogram 3D experience on tablet",
                      "ট্যাবলেটে RobiTrail-এর চট্টগ্রাম ৩ডি অভিজ্ঞতা",
                    ),
                  })
                }
              />
            </Pop>
            <Pop delay={0.35} className="absolute right-0 bottom-0 w-[26%] sm:w-[21%]">
              <PhoneFrame
                alt={L(
                  "RobiTrail Chattogram 3D experience on an Android phone",
                  "অ্যান্ড্রয়েড ফোনে RobiTrail-এর চট্টগ্রাম ৩ডি অভিজ্ঞতা",
                )}
                onEnlarge={() =>
                  setEnlargedImage({
                    src: MOBILE_TABLET_SCREENSHOT_SRC,
                    alt: L(
                      "RobiTrail Chattogram 3D experience on an Android phone",
                      "অ্যান্ড্রয়েড ফোনে RobiTrail-এর চট্টগ্রাম ৩ডি অভিজ্ঞতা",
                    ),
                  })
                }
              />
            </Pop>
          </motion.div>

          <div className="mt-14 grid gap-4 md:grid-cols-2">
            <Reveal className="rounded-3xl bg-white/85 backdrop-blur border border-rose-100 p-6 shadow-sm flex gap-4">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-rose-600 text-white flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-slate-950">
                  {L("Certification included", "সার্টিফিকেশন অন্তর্ভুক্ত")}
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {L(
                    "RobiTrail also includes a certification pathway, allowing users to complete selected learning experiences and earn a certificate through the platform.",
                    "RobiTrail-এ একটি সার্টিফিকেশন পথও রয়েছে, যেখানে নির্বাচিত শিক্ষণ অভিজ্ঞতা সম্পন্ন করে প্ল্যাটফর্মের মাধ্যমে সার্টিফিকেট অর্জন করা যায়।",
                  )}
                </p>
                <button
                  onClick={() => navigate("/certification")}
                  className="mt-3 text-sm font-semibold text-rose-600 hover:underline cursor-pointer"
                >
                  {L("Go to certification →", "সার্টিফিকেশনে যান →")}
                </button>
              </div>
            </Reveal>
            <Reveal
              delay={0.1}
              className="rounded-3xl bg-white/85 backdrop-blur border border-stone-200 p-6 shadow-sm"
            >
              <h2 className="font-display font-bold text-lg text-slate-950">
                {L("Available on every screen", "সব স্ক্রিনেই ব্যবহারযোগ্য")}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                {L(
                  "Designed to work across the devices learners already use.",
                  "শিক্ষার্থীরা যে ডিভাইস ব্যবহার করেন, সবগুলোতেই চলার উপযোগী করে তৈরি।",
                )}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { i: Laptop, l: L("Desktop", "ডেস্কটপ") },
                  { i: Smartphone, l: L("Android / Mobile", "অ্যান্ড্রয়েড / মোবাইল") },
                  { i: Tablet, l: L("Tablet", "ট্যাবলেট") },
                ].map(({ i: Icon, l }) => (
                  <div
                    key={l}
                    className="rounded-2xl bg-stone-50 border border-stone-200 p-3 text-center"
                  >
                    <Icon className="w-6 h-6 mx-auto text-rose-600" />
                    <div className="mt-1.5 text-xs font-semibold text-slate-800">{l}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* 2. WHAT THE APP DOES */}
        <section className="bg-slate-950/[0.93] text-white py-20 sm:py-28">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <Reveal className="max-w-3xl space-y-4">
              <div className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-rose-400">
                {L("What the app does", "অ্যাপটি কীভাবে কাজ করে")}
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight">
                {L("One app, many ways to learn", "একটি অ্যাপ, শেখার অনেক পথ")}
              </h2>
              <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
                {L(
                  "Every user learns differently. RobiTrail offers multiple ways to explore Bangladesh’s digital and telecom landscape — through play, guided lessons, interactive history, technical exploration, and certification-based progression.",
                  "প্রত্যেকে ভিন্নভাবে শেখে। খেলা, নির্দেশিত পাঠ, ইন্টারঅ্যাকটিভ ইতিহাস, প্রযুক্তিগত অনুসন্ধান এবং সার্টিফিকেশনভিত্তিক অগ্রগতির মাধ্যমে RobiTrail বাংলাদেশের ডিজিটাল ও টেলিকম জগৎ জানার নানা পথ খুলে দেয়।",
                )}
              </p>
            </Reveal>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f, i) => (
                <Pop
                  key={f.title}
                  delay={i * 0.1}
                  className="group rounded-3xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-colors"
                >
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}
                  >
                    <f.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="mt-5 text-xs font-mono text-slate-400">0{i + 1}</div>
                  <h3 className="mt-1 font-display text-xl font-bold">
                    {bn ? f.titleBn : f.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                    {bn ? f.textBn : f.text}
                  </p>
                </Pop>
              ))}
            </div>
          </div>
        </section>

        {/* 3. WHAT WE HOPE TO ACHIEVE */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <Reveal className="max-w-3xl space-y-3">
            <Eyebrow>{L("Our vision", "আমাদের স্বপ্ন")}</Eyebrow>
            <h2 className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight text-slate-950">
              {L("What we hope to achieve", "আমরা কী অর্জন করতে চাই")}
            </h2>
          </Reveal>
          <Pop className="mt-10 rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-black/5">
            <button
              type="button"
              onClick={() =>
                setEnlargedImage({
                  src: VISION_ILLUSTRATION_SRC,
                  alt: L(
                    "RobiTrail roadmap: more cities, more 3D games, more tutorials, Bangla and English, certificates, school access and a growing community",
                    "RobiTrail-এর পথনকশা: আরও শহর, আরও ৩ডি গেম, আরও টিউটোরিয়াল, বাংলা ও ইংরেজি, সার্টিফিকেট, স্কুলে পৌঁছানো এবং ক্রমবর্ধমান কমিউনিটি",
                  ),
                })
              }
              className="w-full block cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              aria-label={L(
                "Enlarge RobiTrail roadmap illustration",
                "RobiTrail পথনকশা বড় করে দেখুন",
              )}
            >
              <img
                src={VISION_ILLUSTRATION_SRC}
                alt={L(
                  "RobiTrail roadmap: more cities, more 3D games, more tutorials, Bangla and English, certificates, school access and a growing community",
                  "RobiTrail-এর পথনকশা: আরও শহর, আরও ৩ডি গেম, আরও টিউটোরিয়াল, বাংলা ও ইংরেজি, সার্টিফিকেট, স্কুলে পৌঁছানো এবং ক্রমবর্ধমান কমিউনিটি",
                )}
                className="w-full h-auto block"
              />
            </button>
          </Pop>
          {bn && (
            <Reveal className="mt-4 rounded-2xl bg-white/90 border border-rose-100 p-4 text-sm text-slate-700 leading-relaxed">
              আরও বড়, সমৃদ্ধ ও অন্তর্ভুক্তিমূলক RobiTrail — আরও শহর, আরও ৩ডি গেম, আরও টিউটোরিয়াল, বাংলা ও
              ইংরেজিতে শেখা, সার্টিফিকেট, আরও স্কুলে পৌঁছানো এবং শিক্ষার্থী ও উদ্ভাবকদের ক্রমবর্ধমান
              কমিউনিটি।
            </Reveal>
          )}
          <div className="mt-10 grid gap-6 md:grid-cols-3 text-slate-700 leading-relaxed">
            <Reveal>
              <p>
                {L(
                  "RobiTrail is more than a learning app — it is an attempt to make digital and telecom education more engaging, local, and interactive. We hope to help users better understand how connectivity shapes everyday life in Bangladesh, while making technical ideas easier to approach through design, storytelling, and play.",
                  "RobiTrail শুধু একটি শেখার অ্যাপ নয় — এটি ডিজিটাল ও টেলিকম শিক্ষাকে আরও আকর্ষণীয়, স্থানীয় ও ইন্টারঅ্যাকটিভ করার একটি প্রচেষ্টা। আমরা চাই ব্যবহারকারীরা বুঝুক, সংযোগ কীভাবে বাংলাদেশের দৈনন্দিন জীবনকে গড়ে তোলে, আর ডিজাইন, গল্প ও খেলার মাধ্যমে প্রযুক্তিগত ধারণাগুলো সহজ হয়ে উঠুক।",
                )}
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p>
                {L(
                  "We want RobiTrail to grow into a richer platform with more cities, more learning experiences, better accessibility, stronger interactive content, and wider reach across different types of learners and devices.",
                  "আমরা চাই RobiTrail আরও সমৃদ্ধ একটি প্ল্যাটফর্মে পরিণত হোক — আরও শহর, আরও শেখার অভিজ্ঞতা, উন্নত সহজলভ্যতা, শক্তিশালী ইন্টারঅ্যাকটিভ কনটেন্ট এবং নানা ধরনের শিক্ষার্থী ও ডিভাইসে আরও বিস্তৃত নাগাল নিয়ে।",
                )}
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <p>
                {L(
                  "Our long-term hope is to create a platform where learning feels intuitive, relevant, and memorable — and where digital literacy becomes something users actively experience rather than passively read.",
                  "আমাদের দীর্ঘমেয়াদি আশা এমন একটি প্ল্যাটফর্ম গড়ে তোলা, যেখানে শেখা হবে সহজ, প্রাসঙ্গিক ও স্মরণীয় — এবং ডিজিটাল সাক্ষরতা শুধু পড়ার বিষয় না থেকে সরাসরি অভিজ্ঞতার বিষয় হয়ে উঠবে।",
                )}
              </p>
            </Reveal>
          </div>
          <Reveal className="mt-12 text-center">
            <p className="font-display text-xl sm:text-2xl font-bold text-rose-700 max-w-2xl mx-auto">
              {L(
                "“Because understanding connection should itself feel connected, human, and engaging.”",
                "“কারণ সংযোগকে বোঝার অভিজ্ঞতাও হওয়া উচিত সংযুক্ত, মানবিক ও আকর্ষণীয়।”",
              )}
            </p>
          </Reveal>
        </section>

        {/* 4. HOW WE BUILT IT */}
        <section className="py-20 sm:py-28 bg-gradient-to-b from-transparent via-white/70 to-transparent">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <Reveal className="max-w-3xl space-y-3">
              <Eyebrow>{L("Toolkit", "টুলকিট")}</Eyebrow>
              <h2 className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight text-slate-950">
                {L("How we built it", "যেভাবে আমরা তৈরি করেছি")}
              </h2>
            </Reveal>
            <Pop className="mt-10 rounded-[2rem] bg-white/90 backdrop-blur border border-stone-200 shadow-xl p-6 sm:p-10">
              <div className="grid gap-8 lg:grid-cols-[1fr_1.6fr_1fr] lg:gap-0 lg:divide-x divide-stone-200">
                {TOOL_GROUPS.map((g, gi) => (
                  <Reveal
                    key={g.title}
                    delay={gi * 0.12}
                    className="lg:px-6 first:lg:pl-0 last:lg:pr-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-rose-600 text-white text-xs font-bold flex items-center justify-center">
                        {gi + 1}
                      </span>
                      <h3 className="font-display font-bold text-slate-950">
                        {bn ? g.titleBn : g.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5">{bn ? g.noteBn : g.note}</p>
                    <div className="mt-5 flex flex-wrap gap-3 justify-start">
                      {g.tools.map((t) => (
                        <ToolLogo key={t.name} {...t} />
                      ))}
                    </div>
                  </Reveal>
                ))}
              </div>
            </Pop>
            <Reveal className="mt-8 max-w-3xl">
              <p className="text-slate-700 leading-relaxed">
                {L(
                  "RobiTrail was built through a combination of design, prototyping, web development, animation, and platform integration tools. From interface planning and visual composition to interactive development and backend support, each tool contributed to turning the app into a playable educational experience.",
                  "ডিজাইন, প্রোটোটাইপিং, ওয়েব ডেভেলপমেন্ট, অ্যানিমেশন এবং প্ল্যাটফর্ম ইন্টিগ্রেশনের নানা টুল মিলিয়ে RobiTrail তৈরি করা হয়েছে। ইন্টারফেস পরিকল্পনা ও ভিজ্যুয়াল কম্পোজিশন থেকে শুরু করে ইন্টারঅ্যাকটিভ ডেভেলপমেন্ট ও ব্যাকএন্ড সাপোর্ট — প্রতিটি টুল অ্যাপটিকে একটি খেলার উপযোগী শিক্ষামূলক অভিজ্ঞতায় রূপ দিতে ভূমিকা রেখেছে।",
                )}
              </p>
            </Reveal>
          </div>
        </section>

        {/* 5. TEAM */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <Reveal className="max-w-3xl space-y-3">
            <Eyebrow>{L("The team", "আমাদের দল")}</Eyebrow>
            <h2 className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight text-slate-950">
              {L("Meet Team Torongo", "পরিচিত হোন টিম তরঙ্গের সঙ্গে")}
            </h2>
            <p className="text-slate-700 leading-relaxed">
              {L(
                "Team Torongo brought together development, design, and research to shape RobiTrail into an interactive educational experience. Each member contributed from a different perspective — combining technical building, interface thinking, and content/research direction to make the app more meaningful, engaging, and user-friendly.",
                "Team Torongo ডেভেলপমেন্ট, ডিজাইন ও গবেষণাকে একসঙ্গে এনে RobiTrail-কে একটি ইন্টারঅ্যাকটিভ শিক্ষামূলক অভিজ্ঞতায় রূপ দিয়েছে। প্রত্যেক সদস্য ভিন্ন দৃষ্টিকোণ থেকে অবদান রেখেছেন — প্রযুক্তিগত নির্মাণ, ইন্টারফেস ভাবনা এবং কনটেন্ট ও গবেষণার দিকনির্দেশনা মিলিয়ে অ্যাপটিকে আরও অর্থবহ, আকর্ষণীয় ও ব্যবহারবান্ধব করে তুলেছেন।",
              )}
            </p>
          </Reveal>
          <Pop className="mt-10 rounded-[2rem] overflow-hidden bg-white shadow-2xl ring-1 ring-black/5">
            <button
              type="button"
              onClick={() =>
                setEnlargedImage({
                  src: TEAM_TORONGO_PHOTO_SRC,
                  alt: L(
                    "Team Torongo: Subah Mamun, Adrita Guha and Arpita Nath",
                    "টিম তরঙ্গ: সুবহা মামুন, অদ্রিতা গুহ ও অর্পিতা নাথ",
                  ),
                })
              }
              className="w-full block cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              aria-label={L("Enlarge Team Torongo photograph", "টিম তরঙ্গের ছবি বড় করে দেখুন")}
            >
              <img
                src={TEAM_TORONGO_PHOTO_SRC}
                alt={L(
                  "Team Torongo: Subah Mamun, Adrita Guha and Arpita Nath",
                  "টিম তরঙ্গ: সুবহা মামুন, অদ্রিতা গুহ ও অর্পিতা নাথ",
                )}
                className="w-full h-auto block"
              />
            </button>
          </Pop>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {TEAM.map((m, i) => (
              <Reveal
                key={m.name}
                delay={i * 0.1}
                className="rounded-2xl bg-white/90 border border-stone-200 p-5 shadow-sm text-center"
              >
                <div className="font-display font-bold text-lg text-slate-950">{m.name}</div>
                <div className="mt-1 inline-block rounded-full bg-rose-50 text-rose-700 text-xs font-semibold px-3 py-1">
                  {bn ? m.roleBn : m.role}
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </div>

      {enlargedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={enlargedImage.alt}
          onClick={() => setEnlargedImage(null)}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-6xl w-full max-h-[90vh] flex flex-col items-center"
          >
            <button
              type="button"
              onClick={() => setEnlargedImage(null)}
              aria-label={L("Close enlarged image", "বড় ছবি বন্ধ করুন")}
              className="self-end mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 hover:bg-white text-slate-900 px-3.5 py-1.5 text-xs font-semibold shadow-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>{L("Close", "বন্ধ করুন")}</span>
            </button>
            <img
              src={enlargedImage.src}
              alt={enlargedImage.alt}
              className="max-w-full max-h-[80vh] w-auto h-auto object-contain rounded-2xl shadow-2xl ring-1 ring-white/15 bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};
