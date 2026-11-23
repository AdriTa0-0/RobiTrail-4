# About page: new vision image, footer, full Bangla

## 1. Replace the "What we hope to achieve" image
- Upload your new illustration and swap it in for the current vision image. Same spot, same pop-in animation.
- If the image has English words baked in, add a real-text caption under it that switches with the language (the image itself can't be translated).

## 2. Footer on About
- A shared footer already exists on other pages. Check why it isn't showing at the bottom of About (likely covered by the page's map background or layering) and fix it, so no second footer is added.
- Update the shared footer on every page: "RobiTrail · v2.4.0" (white bold name, softer version), the "বাংলাদেশ গবেষণা" / "Bangladesh Research" link in light blue with hover underline, your new description text, plus a small line saying it's an independent student-built project, not officially endorsed.
- Two columns on desktop, stacked on phone; gentle fade-and-slide-up when it comes into view.

## 3. Full Bangla on About
- Move every About text (headings, paragraphs, feature cards, device labels, buttons, image descriptions, team roles, quote) into the app's existing language system, with natural Bangla versions; section titles use your given names (আমাদের গল্প, অ্যাপটি কীভাবে কাজ করে, আমরা কী অর্জন করতে চাই, যেভাবে আমরা তৈরি করেছি, পরিচিত হোন টিম তরঙ্গের সঙ্গে).
- Tool names, RobiTrail, Team Torongo and people's names stay unchanged.
- Bangla text uses the Hind Siliguri font with comfortable line spacing.
- Language choice already persists across pages and refresh; confirm this.

## Checks
- Screenshots of About in English and Bangla on phone and desktop, including the footer.

## Technical details
- `lovable-assets create` from the upload -> replace `robitrail_vision.png.asset.json` import in `AboutPage.tsx`.
- New `ABOUT_DICT` in translations dictionary; `AboutPage` reads `lang` from `useRobiTrail`.
- Footer in `src/robi/App.tsx`: add `motion` whileInView, grid layout, bilingual description; check z-index vs `BangladeshMapBackdrop`.
