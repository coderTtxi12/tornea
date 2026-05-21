# Tornea marketing landing — design spec

**Date:** 2026-05-20  
**Skills:** Superpowers (brainstorm → plan → execute), ui-ux-pro-max (design system persisted under `.cursor/skills/ui-ux-pro-max/design-system/tornea/`)

## Goal

Replace the minimal login-only home with a full marketing landing that converts organizers to sign in with Google, while preserving auth redirect behavior.

## Brand source of truth

`docs/BRANDING.md` overrides generic ui-ux palette suggestions:

| Token | Value |
|-------|--------|
| Lime | `#7DFF6A` |
| Teal | `#00D4C8` |
| Blue | `#2563FF` |
| Purple | `#8B5CF6` |
| Navy bg | `#020818` |
| Font | Poppins (already in `layout.tsx`) |
| Slogan | Organiza. Compite. Conecta. |

## UX pattern (ui-ux-pro-max)

- **Layout:** Bento grid feature showcase + bold block sections
- **Motion:** 200–300ms hovers; scroll-triggered reveals
- **3D:** WebGL hero (R3F) — abstract sports-tech forms + stadium ring; static fallback for `prefers-reduced-motion`
- **Anti-patterns:** No emoji icons; no hover-only critical actions; WCAG contrast on dark navy

## Sections

1. Sticky nav + CTA “Entrar”
2. Hero: copy, Google CTA, 3D canvas
3. Sports marquee
4. Bento features (5 cards, tilt on hover)
6. Stats row
7. How it works (3 steps)
8. Final CTA band
9. Footer
10. Sticky bottom CTA after scroll (desktop-friendly)

## Technical

- Route: `src/app/page.tsx` → `TorneaLanding` (client)
- **UI:** shadcn/ui (`Button`, `Card`, `Badge`, `Separator`) + Radix Slot — tokens en `globals.css`
- 3D: “Arena ecosystem” — núcleo + graderías + nodos orbitantes + arcos (ui-ux: Interactive 3D showcase, motion parallax). `TorneaHero3D.tsx`
- Auth: unchanged redirect to `/dashboard` or `/solicitar-acceso`
- Añadir más piezas: `pnpm dlx shadcn@latest add <component>` (ver `components.json`)

## Checklist (ui-ux pre-delivery)

- [x] SVG icons only
- [x] `cursor-pointer` on clickables
- [x] Hover + focus transitions
- [x] `prefers-reduced-motion` respected
- [x] Responsive 375 / 768 / 1024 / 1440
