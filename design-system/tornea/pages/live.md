# Live Page Overrides — Cancha · En vivo

> **PROJECT:** Tornea  
> **Overrides:** `design-system/tornea/MASTER.md`  
> **Brand source:** `docs/BRANDING.md`

---

## Layout

- **Pattern:** Vertical wizard — 4 steps (Partido → Datos → Plantilla → En vivo); one primary action per step.
- **Step 1:** `LiveMatchPickerStep` — grid of `Card` match tiles + **Continuar**.
- **Steps 2–4:** `MatchOperationsWorkspace` under `LiveWizardProgress`; scoreboard always visible.
- **Density:** High during step 4 — scoreboard + clock + incident cards.

## Colors (Tornea tokens — not generic green)

| Role | Token / hex |
|------|-------------|
| Background | `brand-navy` `#020818` |
| Live indicator | `brand-lime` `#7DFF6A` + pulse (respect `prefers-reduced-motion`) |
| Primary actions | `brand-blue` `#2563FF` |
| Accents / links | `brand-teal` `#00D4C8` |
| Warnings (5 fouls) | `brand-purple` `#8B5CF6` |
| Cards / surfaces | `LiveCard` / `LIVE_PANEL_CLASS` — `bg-background` (mismo que inputs) |

## Typography

- **Font:** Poppins (app `layout.tsx`) — do not introduce Fira/Cinzel from generic search.

## Components

- **Header card:** `LiveMatchHeader` — `bg-gradient-night` scoreboard + `LivePhaseStepper` (completed = teal + check; active = lime ring).
- **Form fields:** `LiveInput` / `LiveSelect` — pill (`rounded-full`), `bg-background`, foco `ring-brand-teal/40` (mismo patrón que `AccessRequestWizard` en solicitar-acceso). Estilos en `live-field-styles.ts`.
- **Panels:** `LiveCard` y `LivePanelShell` usan `LIVE_PANEL_CLASS` (`bg-background`) para alinear cajas con los campos.
- **Lineups:** `SlotToggleGroup` (T = lime, S = teal); starter counter badge; `LiveEmptyRoster` for empty teams.
- **Sidebar list:** `LiveMatchList` — left border `brand-lime` when selected; `brand-teal` on hover.
- **Incident toolbar:** `Button` secondary; finish = default blue.
- **Event feed:** `IncidentEventFeed` — tinted icon chips per event type; minute `MockBadge` lime.

## Motion & a11y

- Transitions `duration-200` on hover/focus.
- `cursor-pointer` on all match cards and incident chips.
- Focus ring visible on keyboard nav.
- No emoji icons.

## Anti-patterns

- Mock disabled buttons (`MockActionButton`) in production live flow.
- Hover scale that shifts layout.
- Blocking UI on 5-foul warning (banner only).
