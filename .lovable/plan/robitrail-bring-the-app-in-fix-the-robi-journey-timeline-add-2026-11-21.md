# RobiTrail: bring the app in, fix the Robi Journey timeline, add an About page

## 1. Bring the uploaded app into this project
- Copy all screens, games, 3D scenes, handbook, videos, certification, account, data and translations from the uploaded code.
- Keep the existing look, navigation and every current page (home, cities, games, game sessions, discover, Robi Journey, videos, handbook, research, certification, account / trail pass).
- Each page gets its own address and title/description so links and sharing work.
- Keep the existing Firebase sign-in/account setup as it is in the uploaded code. The small server parts (from the uploaded server file) move into this project's server functions.
- Team photo and the three pasted images become hosted app images.

## 2. Robi Journey timeline fixes
- New background: a full, soft, shadowed Bangladesh map behind the whole page, with faint glowing signal/route lines and gentle moving connection dots. Low contrast so the cards stay readable.
- Mobile: keep a curved wave path (a narrower, taller S-curve drawn to the phone width) instead of the broken one, with year circles and cards alternating along it.
- Add safe side margins so year circles and cards are never cut off or overlapping, on phone, tablet and desktop.

## 3. New About page (/about, added to the main menu)
Scroll story with slide-up text, fade-ins and pop-up image blocks, in this order:
1. **Intro** - "A digital journey through Bangladesh's connected future": laptop, Android phone and tablet frames showing real RobiTrail screens; purpose text, certification pathway, and "available on desktop, Android/mobile, tablet".
2. **What the app does** - "One app, many ways to learn": four cards - Play, Watch, Explore, Learn & Earn.
3. **What we hope to achieve** - a newly generated RobiTrail-style illustration (Bangladesh, cities, connectivity, youth learning) plus the vision text and closing line.
4. **How we built it** - infographic panel with logos grouped: Design & Planning (Canva, Figma), Development & Experience (Google AI Studio, React, TypeScript, Three.js, GSAP), Platform & Services (bdapps, Firebase).
5. **Meet Team Torongo** - your team photo shown uncropped, with Adrita Guha (Developer), Arpita Nath (UI/UX Designer), Subha Mamun (Research Lead).

## 4. Check
- Screenshots of Robi Journey and About on phone, tablet and desktop to confirm nothing is clipped or overlapping.

## Technical details
- Map the custom RouterContext routes onto TanStack file routes (keeping the same URLs); swap `window.history` navigation helpers for TanStack `Link`/`navigate`.
- Express endpoints in server.ts -> `createServerFn` / `src/routes/api/*`; browser-only code (Three.js, GSAP ScrollTrigger, Firebase) loaded client-side only.
- Install three, gsap, motion, firebase, lucide-react.
- Bangladesh map as an inline SVG path; mobile wave via an SVG path computed from container width.
