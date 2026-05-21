# Tornea landing page — implementation plan

> **For agent:** Execute with superpowers `executing-plans`. Design: `docs/superpowers/specs/2026-05-20-landing-page-design.md`

## Task 1: Landing hooks & subcomponents

- [x] `use-landing-in-view.ts` — IntersectionObserver scroll reveal
- [x] `LandingBentoCard.tsx` — bento + 3D CSS tilt on hover
- [x] `LandingJourney.tsx` — horizontal scroll-snap (Organiza / Compite / Conecta)
- [x] `LandingStickyCta.tsx` — appears after scroll

## Task 2: 3D hero upgrade

- [x] Stadium torus ring + stylized “T” blocks
- [x] Pointer parallax on hero canvas
- [x] Reduced-motion static orb unchanged

## Task 3: Compose TorneaLanding

- [x] Wire new sections, scroll reveals, sticky CTA
- [x] Keep Google auth + redirects

## Task 4: Styles & design system

- [x] Extend `globals.css` (scroll reveal, journey, tilt, sticky CTA)
- [x] Copy `design-system/tornea` to repo root for team reference

## Task 5: Verify

- [x] `pnpm run build` passes
