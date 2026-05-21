"use client";

import Link from "next/link";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

import { DASHBOARD_NAV_ITEMS, type DashboardNavKey } from "./dashboard-nav-config";

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
  layout: "vertical" | "horizontal";
};

function DashboardNavRail({ active, layout }: NavRailProps) {
  const vertical = layout === "vertical";

  return (
    <nav
      className={
        vertical
          ? "flex min-h-0 flex-col items-center gap-5 py-4 sm:gap-6 sm:py-5"
          : "flex flex-row items-center gap-1.5 px-2 py-2 sm:gap-2"
      }
      aria-label="Navegación principal del dashboard"
    >
      {DASHBOARD_NAV_ITEMS.map(({ key, href, label, symbol }) => {
        const isActive = active === key;
        return (
          <Link
            key={key}
            href={href}
            data-dashboard-nav={key}
            title={label}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
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
          </Link>
        );
      })}
    </nav>
  );
}

type DashboardNavSidebarProps = {
  active: DashboardNavKey;
};

const SCROLL_STEP_PX = 120;

function SidebarPill({ active }: { active: DashboardNavKey }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollHeight > el.clientHeight + 1;
    setOverflow(hasOverflow);
    setCanScrollUp(el.scrollTop > 2);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(updateScrollState);
    });
    ro.observe(el);

    el.addEventListener("scroll", updateScrollState, { passive: true });
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    window.visualViewport?.addEventListener("resize", updateScrollState);

    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      window.visualViewport?.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  useLayoutEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const target = root.querySelector<HTMLElement>(`[data-dashboard-nav="${active}"]`);
    target?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    requestAnimationFrame(updateScrollState);
  }, [active, updateScrollState]);

  const scrollByDir = useCallback((dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ top: dir * SCROLL_STEP_PX, behavior: "smooth" });
  }, []);

  return (
    <div className="bg-brand-blue flex max-h-[calc(100dvh-2rem)] w-[3.25rem] flex-col overflow-hidden rounded-full sm:max-h-[calc(100dvh-2.5rem)] sm:w-[3.45rem]">
      {overflow ? (
        <button
          type="button"
          className="hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-25 flex shrink-0 items-center justify-center py-1.5"
          aria-label="Ver opciones anteriores del menú"
          disabled={!canScrollUp}
          onClick={() => scrollByDir(-1)}
        >
          <span className="material-symbols-rounded text-[22px] leading-none text-white/80 select-none">
            expand_less
          </span>
        </button>
      ) : null}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain [scrollbar-color:rgba(255,255,255,0.35)_transparent] [scrollbar-width:thin]"
      >
        <DashboardNavRail active={active} layout="vertical" />
      </div>
      {overflow ? (
        <button
          type="button"
          className="hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-25 flex shrink-0 items-center justify-center py-1.5"
          aria-label="Ver más opciones del menú"
          disabled={!canScrollDown}
          onClick={() => scrollByDir(1)}
        >
          <span className="material-symbols-rounded text-[22px] leading-none text-white/80 select-none">
            expand_more
          </span>
        </button>
      ) : null}
    </div>
  );
}

/** Columna izquierda: rail fijo a altura de viewport, píldora azul centrada (tema Tornea). */
export function DashboardNavSidebar({ active }: DashboardNavSidebarProps) {
  return (
    <aside
      className="border-border bg-background sticky top-0 z-30 hidden h-dvh w-[4.25rem] shrink-0 flex-col items-center justify-center self-start border-r sm:flex sm:w-[4.5rem]"
      style={{
        paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <SidebarPill active={active} />
    </aside>
  );
}

type DashboardNavPillMobileProps = {
  active: DashboardNavKey;
};

/** Barra horizontal compacta (solo móvil). */
export function DashboardNavPillMobile({ active }: DashboardNavPillMobileProps) {
  return (
    <div className="border-border flex justify-center border-b bg-background py-2.5 sm:hidden">
      <div className="rounded-full bg-brand-blue">
        <DashboardNavRail active={active} layout="horizontal" />
      </div>
    </div>
  );
}

export type { DashboardNavKey } from "./dashboard-nav-config";
