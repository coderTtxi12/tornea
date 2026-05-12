"use client";

import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import { DASHBOARD_NAV_ITEMS, type DashboardNavKey } from "./dashboard-nav-config";

const pillShadow =
  "shadow-[0_12px_40px_-8px_color-mix(in_srgb,var(--tornea-blue)_55%,transparent)]";

function MaterialGlyph({
  name,
  active,
  sizeClass,
}: {
  name: string;
  active: boolean;
  sizeClass: string;
}) {
  return (
    <span
      className={`material-symbols-rounded block leading-none select-none transition-[color,filter,transform] duration-200 ease-out ${active ? "text-white" : "text-white/55 group-hover:text-white"} ${sizeClass}`}
      aria-hidden
    >
      {name}
    </span>
  );
}

type NavRailProps = {
  active: DashboardNavKey;
  onNavigate: (key: DashboardNavKey) => void;
  layout: "vertical" | "horizontal";
  /** Solo vertical: recorta desde el final si el espacio es bajo. */
  visibleCount?: number;
};

const DashboardNavRail = forwardRef<HTMLDivElement, NavRailProps>(function DashboardNavRail(
  { active, onNavigate, layout, visibleCount = DASHBOARD_NAV_ITEMS.length },
  ref,
) {
  const vertical = layout === "vertical";
  const items = DASHBOARD_NAV_ITEMS.slice(
    0,
    Math.max(1, Math.min(visibleCount, DASHBOARD_NAV_ITEMS.length)),
  );

  return (
    <nav
      ref={ref}
      className={
        vertical
          ? "flex min-h-0 flex-col items-center gap-5 py-4 sm:gap-6 sm:py-5"
          : "flex flex-row items-center gap-1.5 px-2 py-2 sm:gap-2"
      }
      aria-label="Navegación principal del dashboard"
    >
      {items.map(({ key, label, symbol }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            type="button"
            title={label}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onNavigate(key)}
            className={`group relative flex shrink-0 items-center justify-center rounded-full outline-none transition-[background-color,transform] duration-200 ease-out hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tornea-blue)] active:scale-95 motion-reduce:transition-none motion-reduce:hover:transform-none ${
              vertical ? "size-11 sm:size-12" : "size-10"
            }`}
          >
            <MaterialGlyph
              name={symbol}
              active={isActive}
              sizeClass={
                vertical
                  ? "text-[28px] sm:text-[30px] motion-safe:group-hover:scale-[1.12] motion-safe:group-hover:-translate-y-px motion-safe:group-hover:drop-shadow-[0_0_10px_color-mix(in_srgb,var(--tornea-lime)_65%,transparent)]"
                  : "text-[23px] motion-safe:group-hover:scale-110 motion-safe:group-hover:drop-shadow-[0_0_8px_color-mix(in_srgb,white_35%,transparent)]"
              }
            />
          </button>
        );
      })}
    </nav>
  );
});

DashboardNavRail.displayName = "DashboardNavRail";

/** Altura vertical disponible para el rail: tope CSS (p. ej. 100dvh − márgenes), no solo el alto actual del contenido. Así al agrandar la ventana vuelven a mostrarse iconos que se habían ocultado. */
function resolvePillVerticalBudgetPx(pill: HTMLElement): number {
  const { maxHeight } = getComputedStyle(pill);
  if (maxHeight && maxHeight !== "none") {
    const capPx = Number.parseFloat(maxHeight);
    if (Number.isFinite(capPx) && capPx > 0) {
      return capPx;
    }
  }
  return pill.clientHeight;
}

function useAdaptiveVerticalNavCount(
  pillRef: RefObject<HTMLDivElement | null>,
  navRef: RefObject<HTMLDivElement | null>,
  active: DashboardNavKey,
) {
  const [visibleCount, setVisibleCount] = useState(DASHBOARD_NAV_ITEMS.length);

  const recompute = useCallback(() => {
    const pill = pillRef.current;
    const nav = navRef.current;
    if (!pill || !nav) return;

    const innerH = resolvePillVerticalBudgetPx(pill);
    const kids = nav.children;
    if (kids.length === 0) return;

    const btnEl = kids[0] as HTMLElement;
    const cs = getComputedStyle(nav);
    const gap = Number.parseFloat(cs.gap) || 0;
    const navPadY =
      (Number.parseFloat(cs.paddingTop) || 0) + (Number.parseFloat(cs.paddingBottom) || 0);
    const button = btnEl.getBoundingClientRect().height;
    const stride = button + gap;
    const space = innerH - navPadY;

    if (space < button || stride <= 0) {
      setVisibleCount(1);
      return;
    }

    let maxFit = Math.min(
      DASHBOARD_NAV_ITEMS.length,
      Math.max(1, Math.floor((space + gap) / stride)),
    );

    const activeIdx = DASHBOARD_NAV_ITEMS.findIndex((i) => i.key === active);
    if (activeIdx >= 0 && activeIdx >= maxFit) {
      maxFit = Math.min(DASHBOARD_NAV_ITEMS.length, activeIdx + 1);
    }

    setVisibleCount(maxFit);
  }, [active]);

  useLayoutEffect(() => {
    const pill = pillRef.current;
    if (!pill) return;

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(() => recompute());
    });
    ro.observe(pill);

    recompute();
    window.addEventListener("resize", recompute);
    window.visualViewport?.addEventListener("resize", recompute);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
      window.visualViewport?.removeEventListener("resize", recompute);
    };
  }, [recompute]);

  return visibleCount;
}

type DashboardNavSidebarProps = {
  active: DashboardNavKey;
  onNavigate: (key: DashboardNavKey) => void;
};

function SidebarPill({
  active,
  onNavigate,
}: {
  active: DashboardNavKey;
  onNavigate: (key: DashboardNavKey) => void;
}) {
  const pillRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const visibleCount = useAdaptiveVerticalNavCount(pillRef, navRef, active);

  return (
    <div
      ref={pillRef}
      className={`${pillShadow} flex max-h-[calc(100dvh-2rem)] w-[3.25rem] flex-col items-center justify-center overflow-hidden rounded-full bg-brand-blue sm:w-[3.45rem] sm:max-h-[calc(100dvh-2.5rem)]`}
    >
      <DashboardNavRail
        ref={navRef}
        active={active}
        onNavigate={onNavigate}
        layout="vertical"
        visibleCount={visibleCount}
      />
    </div>
  );
}

/** Columna izquierda: rail fijo a altura de viewport, píldora azul centrada (tema Tornea). */
export function DashboardNavSidebar({ active, onNavigate }: DashboardNavSidebarProps) {
  return (
    <aside
      className="border-border bg-background sticky top-0 z-30 hidden h-dvh w-[4.25rem] shrink-0 flex-col items-center justify-center self-start border-r sm:flex sm:w-[4.5rem]"
      style={{
        paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <SidebarPill active={active} onNavigate={onNavigate} />
    </aside>
  );
}

type DashboardNavPillMobileProps = {
  active: DashboardNavKey;
  onNavigate: (key: DashboardNavKey) => void;
};

/** Barra horizontal compacta (solo móvil). */
export function DashboardNavPillMobile({ active, onNavigate }: DashboardNavPillMobileProps) {
  return (
    <div className="border-border flex justify-center border-b bg-background py-2.5 sm:hidden">
      <div
        className={`${pillShadow} rounded-full bg-brand-blue`}
      >
        <DashboardNavRail active={active} onNavigate={onNavigate} layout="horizontal" />
      </div>
    </div>
  );
}

export type { DashboardNavKey } from "./dashboard-nav-config";
