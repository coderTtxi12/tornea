"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { DashboardRightSlideover } from "./DashboardRightSlideover";
import { DashboardRightRail } from "./DashboardRightRail";
import {
  DashboardEmptyLeaguesPanel,
  LeaguesMainError,
  LeaguesMainLoading,
  NewLeagueCategoryForm,
  NewLeagueForm,
  NewMatchForm,
  NewPlayerForm,
  NewTeamForm,
  NewVenueForm,
  PlayerTechnicalSheetPanel,
  type DashboardMyLeaguesState,
  type MyLeaguesMatchRow,
} from "./leagues";
import {
  DashboardNavPillMobile,
  DashboardNavSidebar,
  type DashboardNavKey,
} from "./nav";
import { DashboardViewSwitch } from "./views";

export type DashboardArenaLayoutProps = {
  avatarUrl: string | null;
  avatarInitial: string;
  onSignOut: () => void;
  signingOut: boolean;
  authConfigured: boolean;
  myLeagues: DashboardMyLeaguesState;
  /** Al cambiar (p. ej. tras crear liga), el rail vuelve a pedir actividad/pendientes. */
  railRefreshKey?: number;
  onLeagueCreated?: () => void;
  onLoadMorePlayers?: () => Promise<{
    ok: boolean;
    playerCount: number;
    hasMore: boolean;
  } | null>;
  playersLoadingMore?: boolean;
};

type RightDrawerState =
  | { kind: "closed" }
  | { kind: "new-league" }
  | { kind: "new-category"; leagueId: string; leagueName: string }
  | { kind: "new-venue" }
  | { kind: "edit-venue"; leagueId: string; venueId: string }
  | { kind: "register-team" }
  | { kind: "edit-team"; leagueId: string; teamId: string }
  | { kind: "register-player"; prefillTeamId?: string }
  | { kind: "edit-player"; leagueId: string; teamId: string; playerId: string }
  | { kind: "player-sheet"; leagueId: string; teamId: string; playerId: string }
  | { kind: "new-match" }
  | { kind: "edit-match"; initialRow: MyLeaguesMatchRow };

function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a7.723 7.723 0 0 1 0 .255c-.008.379.137.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.37.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a7.723 7.723 0 0 1 0-.255c.007-.38-.138-.751-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

function IconBell({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

/** Solo después de montar — evita mismatch de hidratación ⌘ vs Ctrl. */
function useSearchShortcutOs() {
  const [mode, setMode] = useState<"mac" | "other" | null>(null);
  useEffect(() => {
    const ua = navigator.userAgent;
    const platform = navigator.platform;
    const mac =
      /Mac|iPhone|iPad|iPod/i.test(ua) ||
      platform === "MacIntel" ||
      platform.toUpperCase().includes("MAC");
    setMode(mac ? "mac" : "other");
  }, []);
  return mode;
}

function HeaderSearchShortcut({ mode }: { mode: "mac" | "other" | null }) {
  return (
    <div
      className="border-border bg-background/80 text-foreground-subtle hidden shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 shadow-sm lg:flex"
      aria-hidden={mode === null}
    >
      {mode === null ? (
        <span className="inline-block h-[1.125rem] min-w-[4.25rem] font-mono text-[11px] opacity-0">
          ⌘ K
        </span>
      ) : mode === "mac" ? (
        <>
          <kbd className="border-border min-w-[1.35rem] rounded border bg-surface-code/60 px-1 py-0.5 text-center font-mono text-[11px] font-semibold leading-none">
            ⌘
          </kbd>
          <kbd className="border-border min-w-[1.35rem] rounded border bg-surface-code/60 px-1 py-0.5 text-center font-mono text-[11px] font-semibold leading-none">
            K
          </kbd>
        </>
      ) : (
        <>
          <kbd className="border-border rounded border bg-surface-code/60 px-1.5 py-0.5 font-mono text-[11px] font-semibold leading-none">
            Ctrl
          </kbd>
          <span className="text-foreground-subtle select-none text-[10px] font-medium opacity-80">+</span>
          <kbd className="border-border min-w-[1.35rem] rounded border bg-surface-code/60 px-1.5 py-0.5 text-center font-mono text-[11px] font-semibold leading-none">
            K
          </kbd>
        </>
      )}
    </div>
  );
}

export function DashboardArenaLayout({
  avatarUrl,
  avatarInitial,
  onSignOut,
  signingOut,
  authConfigured,
  myLeagues,
  railRefreshKey = 0,
  onLeagueCreated,
  onLoadMorePlayers,
  playersLoadingMore,
}: DashboardArenaLayoutProps) {
  const [nav, setNav] = useState<DashboardNavKey>("home");
  const [drawer, setDrawer] = useState<RightDrawerState>({ kind: "closed" });
  const [leagueFormKey, setLeagueFormKey] = useState(0);
  const [categoryFormKey, setCategoryFormKey] = useState(0);
  const [venueFormKey, setVenueFormKey] = useState(0);
  const [teamFormKey, setTeamFormKey] = useState(0);
  const [playerFormKey, setPlayerFormKey] = useState(0);
  const [matchFormKey, setMatchFormKey] = useState(0);
  const searchShortcutOs = useSearchShortcutOs();
  const [drawerBusy, setDrawerBusy] = useState(false);

  const hasLeagues =
    myLeagues.status === "ready" && myLeagues.items.length > 0;

  const openNewLeagueDrawer = useCallback(() => {
    setLeagueFormKey((k) => k + 1);
    setDrawer({ kind: "new-league" });
  }, []);

  const openNewCategoryDrawer = useCallback((args: { leagueId: string; leagueName: string }) => {
    setCategoryFormKey((k) => k + 1);
    setDrawer({ kind: "new-category", ...args });
  }, []);

  const openNewVenueDrawer = useCallback(() => {
    setVenueFormKey((k) => k + 1);
    setDrawer({ kind: "new-venue" });
  }, []);

  const openEditVenueDrawer = useCallback((args: { leagueId: string; venueId: string }) => {
    setVenueFormKey((k) => k + 1);
    setDrawer({ kind: "edit-venue", ...args });
  }, []);

  const openRegisterTeamDrawer = useCallback(() => {
    setTeamFormKey((k) => k + 1);
    setDrawer({ kind: "register-team" });
  }, []);

  const openEditTeamDrawer = useCallback((args: { leagueId: string; teamId: string }) => {
    setTeamFormKey((k) => k + 1);
    setDrawer({ kind: "edit-team", ...args });
  }, []);

  const openRegisterPlayerDrawer = useCallback((args?: { prefillTeamId?: string }) => {
    setPlayerFormKey((k) => k + 1);
    setDrawer({ kind: "register-player", prefillTeamId: args?.prefillTeamId });
  }, []);

  const openEditPlayerDrawer = useCallback(
    (args: { leagueId: string; teamId: string; playerId: string }) => {
      setPlayerFormKey((k) => k + 1);
      setDrawer({ kind: "edit-player", ...args });
    },
    [],
  );

  const openPlayerSheetDrawer = useCallback(
    (args: { leagueId: string; teamId: string; playerId: string }) => {
      setDrawer({ kind: "player-sheet", ...args });
    },
    [],
  );

  const openNewMatchDrawer = useCallback(() => {
    setMatchFormKey((k) => k + 1);
    setDrawer({ kind: "new-match" });
  }, []);

  const openEditMatchDrawer = useCallback((row: MyLeaguesMatchRow) => {
    setMatchFormKey((k) => k + 1);
    setDrawer({ kind: "edit-match", initialRow: row });
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawer({ kind: "closed" });
  }, []);

  useEffect(() => {
    setDrawerBusy(false);
  }, [drawer.kind]);

  return (
    <div
      className="bg-background text-foreground flex min-h-dvh w-full antialiased"
      style={{
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <DashboardNavSidebar active={nav} onNavigate={setNav} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <header
          className="flex shrink-0 items-center gap-3 bg-background px-3 pb-3 sm:gap-4 sm:px-5"
          style={{
            paddingTop: "max(1.25rem, calc(0.5rem + env(safe-area-inset-top, 0px)))",
          }}
        >
          <div className="border-border bg-surface-code/60 text-foreground-subtle relative hidden min-h-0 min-w-0 max-w-xl flex-1 items-center gap-2 rounded-full border py-2.5 pr-3 pl-11 text-sm sm:flex sm:max-w-2xl">
            <IconSearch className="text-foreground-muted pointer-events-none absolute left-3.5 size-4" />
            <input
              type="search"
              name="dashboard-search"
              autoComplete="off"
              placeholder="Buscar club, torneo, jugador…"
              className="placeholder:text-foreground-muted min-w-0 flex-1 bg-transparent pr-2 outline-none"
              aria-label="Búsqueda del panel"
              aria-keyshortcuts={searchShortcutOs === "mac" ? "Meta+K" : searchShortcutOs === "other" ? "Control+K" : undefined}
            />
            <HeaderSearchShortcut mode={searchShortcutOs} />
          </div>
            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => onSignOut()}
              disabled={signingOut || !authConfigured}
              className="text-foreground-muted hover:text-foreground px-1 text-xs font-medium underline-offset-4 hover:underline sm:text-sm disabled:opacity-50"
            >
              {signingOut ? "Saliendo…" : "Cerrar sesión"}
            </button>
            <button
              type="button"
              disabled
              className="border-border bg-surface-code text-foreground-muted hover:border-brand-teal/40 relative flex size-9 items-center justify-center rounded-full border transition-colors sm:size-10"
              aria-label="Alertas"
            >
              <IconBell className="size-[1.1rem]" />
              <span className="bg-brand-lime absolute top-1 right-1 size-2 rounded-full ring-2 ring-background motion-safe:animate-pulse" />
            </button>
            <button
              type="button"
              disabled
              className="border-border bg-surface-code text-foreground-muted flex size-9 items-center justify-center rounded-full border hover:border-brand-teal/40 sm:size-10"
              aria-label="Ajustes rápidos"
            >
              <IconSettings className="size-[1.1rem]" />
            </button>
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                width={36}
                height={36}
                className="border-border size-9 rounded-full border-2 object-cover sm:size-10"
              />
            ) : (
              <div className="border-border from-brand-lime/40 text-brand-navy flex size-9 items-center justify-center rounded-full border-2 bg-gradient-to-br to-brand-teal/50 text-xs font-bold sm:size-10">
                {avatarInitial}
              </div>
            )}
          </div>
        </header>

        <DashboardNavPillMobile active={nav} onNavigate={setNav} />

        <div className="bg-background flex min-h-0 flex-1">
          <main className="min-h-0 flex-1 overflow-y-auto bg-background px-3 py-5 sm:px-5 lg:px-6 lg:py-8">
            <div className="mx-auto max-w-5xl xl:max-w-none xl:pr-2 2xl:max-w-[calc(100vw-22rem)]">
              {myLeagues.status === "loading" ? (
                <LeaguesMainLoading />
              ) : myLeagues.status === "error" ? (
                <LeaguesMainError
                  message={myLeagues.message}
                  onRetry={myLeagues.onRetry}
                />
              ) : !hasLeagues ? (
                <DashboardEmptyLeaguesPanel onOpenNewLeagueDrawer={openNewLeagueDrawer} />
              ) : (
                <DashboardViewSwitch
                  nav={nav}
                  leagueOrgCards={
                    myLeagues.status === "ready" ? myLeagues.items : []
                  }
                  teamRows={myLeagues.status === "ready" ? myLeagues.teams : []}
                  playerRows={myLeagues.status === "ready" ? myLeagues.players : []}
                  playersNextCursor={
                    myLeagues.status === "ready" ? myLeagues.playersNextCursor : null
                  }
                  onLoadMorePlayers={onLoadMorePlayers}
                  playersLoadingMore={playersLoadingMore}
                  onOpenNewLeagueDrawer={openNewLeagueDrawer}
                  onOpenNewCategoryDrawer={openNewCategoryDrawer}
                  onOpenNewVenueDrawer={openNewVenueDrawer}
                  onOpenEditVenueDrawer={openEditVenueDrawer}
                  venueRows={myLeagues.status === "ready" ? myLeagues.venues : []}
                  onOpenRegisterTeamDrawer={openRegisterTeamDrawer}
                  onOpenEditTeamDrawer={openEditTeamDrawer}
                  onOpenRegisterPlayerDrawer={openRegisterPlayerDrawer}
                  onOpenPlayerSheetDrawer={openPlayerSheetDrawer}
                  onOpenNewMatchDrawer={openNewMatchDrawer}
                  onOpenEditMatchDrawer={openEditMatchDrawer}
                  fixtureDataRefreshKey={railRefreshKey}
                />
              )}
            </div>
          </main>

          {hasLeagues ? <DashboardRightRail refreshKey={railRefreshKey} /> : null}
        </div>
      </div>

      {drawer.kind !== "closed" ? (
        <DashboardRightSlideover
          open
          size={drawer.kind === "player-sheet" ? "2xl" : "xl"}
          preventClose={drawerBusy}
          title={
            drawer.kind === "new-league"
              ? "Nueva liga"
              : drawer.kind === "new-category"
                ? "Nueva categoría"
                : drawer.kind === "new-match"
                  ? "Nuevo partido"
                  : drawer.kind === "edit-match"
                    ? "Editar partido"
                    : drawer.kind === "edit-team"
                  ? "Editar equipo"
                  : drawer.kind === "register-player"
                    ? "Agregar jugador"
                    : drawer.kind === "edit-player"
                      ? "Editar jugador"
                      : drawer.kind === "player-sheet"
                        ? "Ficha técnica"
                        : drawer.kind === "new-venue"
                          ? "Nueva cancha"
                          : drawer.kind === "edit-venue"
                            ? "Editar cancha"
                            : "Registrar equipo"
          }
          description={
            drawer.kind === "new-league"
              ? "Completá los datos; el escudo es opcional. Se usa Idempotency-Key para evitar duplicados si la red falla."
              : drawer.kind === "new-category"
                ? "La categoría queda en league_categories y se ordena al final (sort_order)."
                : drawer.kind === "new-match"
                  ? "Alta en matches: temporada, equipos inscritos (season_teams), fecha/hora y cancha opcional."
                  : drawer.kind === "edit-match"
                    ? "Actualizá fecha, equipos, fase, cancha o notas; se validan las mismas reglas que al programar."
                    : drawer.kind === "edit-team"
                  ? "Modificá categoría, contactos, estado o escudo. La liga no se cambia desde acá."
                  : drawer.kind === "register-player"
                    ? "Selecciona el equipo y captura los datos. La foto, la CURP y el WhatsApp son opcionales."
                    : drawer.kind === "edit-player"
                      ? "Nombre, nacimiento, dorsal, posición y WhatsApp. Nueva foto o CURP opcional."
                      : drawer.kind === "player-sheet"
                        ? "Perfil visual con estadísticas acumuladas en esta liga (todas las temporadas con partidos registrados)."
                        : drawer.kind === "new-venue"
                          ? "Nombre, dirección y superficie obligatorios. Fotos y disponibilidad opcionales; se guardan en venues (metadata) y Storage."
                          : drawer.kind === "edit-venue"
                            ? "Actualizá datos y superficie; podés sumar fotos o quitar todas. La liga no se cambia desde acá."
                            : "Elegí liga y categoría, datos del dirigente y contacto adicional. El escudo es opcional."
          }
          onClose={closeDrawer}
        >
          {drawer.kind === "new-league" ? (
            <NewLeagueForm
              key={leagueFormKey}
              variant="drawer"
              onCancel={closeDrawer}
              onBusyChange={setDrawerBusy}
              onLeagueCreated={() => {
                onLeagueCreated?.();
                closeDrawer();
              }}
            />
          ) : drawer.kind === "new-category" ? (
            <NewLeagueCategoryForm
              key={`${drawer.leagueId}-${categoryFormKey}`}
              leagueId={drawer.leagueId}
              leagueName={drawer.leagueName}
              onClose={closeDrawer}
              onBusyChange={setDrawerBusy}
              onCategoryCreated={onLeagueCreated}
            />
          ) : (drawer.kind === "new-match" || drawer.kind === "edit-match") &&
            myLeagues.status === "ready" ? (
            <NewMatchForm
              key={
                drawer.kind === "edit-match"
                  ? `edit-match-${drawer.initialRow.id}-${matchFormKey}`
                  : `new-match-${matchFormKey}`
              }
              leagues={myLeagues.items}
              venues={myLeagues.venues}
              editRow={drawer.kind === "edit-match" ? drawer.initialRow : null}
              onClose={closeDrawer}
              onBusyChange={setDrawerBusy}
              onMatchCreated={onLeagueCreated}
            />
          ) : drawer.kind === "player-sheet" ? (
            <PlayerTechnicalSheetPanel
              key={`sheet-${drawer.leagueId}-${drawer.teamId}-${drawer.playerId}`}
              leagueId={drawer.leagueId}
              teamId={drawer.teamId}
              playerId={drawer.playerId}
              onClose={closeDrawer}
              onRequestEdit={() => {
                setPlayerFormKey((k) => k + 1);
                setDrawer({
                  kind: "edit-player",
                  leagueId: drawer.leagueId,
                  teamId: drawer.teamId,
                  playerId: drawer.playerId,
                });
              }}
            />
          ) : (drawer.kind === "new-venue" || drawer.kind === "edit-venue") &&
            myLeagues.status === "ready" ? (
            <NewVenueForm
              key={
                drawer.kind === "edit-venue"
                  ? `edit-venue-${drawer.leagueId}-${drawer.venueId}-${venueFormKey}`
                  : `new-venue-${venueFormKey}`
              }
              leagues={myLeagues.items}
              editTarget={
                drawer.kind === "edit-venue"
                  ? { leagueId: drawer.leagueId, venueId: drawer.venueId }
                  : null
              }
              onClose={closeDrawer}
              onBusyChange={setDrawerBusy}
              onVenueCreated={onLeagueCreated}
            />
          ) : myLeagues.status === "ready" &&
            (drawer.kind === "register-team" || drawer.kind === "edit-team") ? (
            <NewTeamForm
              key={
                drawer.kind === "edit-team"
                  ? `edit-${drawer.leagueId}-${drawer.teamId}`
                  : `register-${teamFormKey}`
              }
              leagues={myLeagues.items}
              editTarget={
                drawer.kind === "edit-team"
                  ? { leagueId: drawer.leagueId, teamId: drawer.teamId }
                  : null
              }
              onClose={closeDrawer}
              onBusyChange={setDrawerBusy}
              onTeamCreated={() => {
                onLeagueCreated?.();
                closeDrawer();
              }}
            />
          ) : myLeagues.status === "ready" &&
            (drawer.kind === "register-player" || drawer.kind === "edit-player") ? (
            <NewPlayerForm
              key={
                drawer.kind === "edit-player"
                  ? `edit-player-${drawer.leagueId}-${drawer.teamId}-${drawer.playerId}`
                  : `player-${playerFormKey}`
              }
              teamRows={myLeagues.teams}
              prefillTeamId={drawer.kind === "register-player" ? drawer.prefillTeamId : undefined}
              editTarget={
                drawer.kind === "edit-player"
                  ? {
                      leagueId: drawer.leagueId,
                      teamId: drawer.teamId,
                      playerId: drawer.playerId,
                    }
                  : null
              }
              onClose={closeDrawer}
              onBusyChange={setDrawerBusy}
              onPlayerCreated={() => {
                closeDrawer();
                onLeagueCreated?.();
              }}
            />
          ) : null}
        </DashboardRightSlideover>
      ) : null}
    </div>
  );
}
