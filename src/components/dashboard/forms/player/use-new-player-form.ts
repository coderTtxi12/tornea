"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { MyLeaguesTeamRow } from "@/components/dashboard/leagues/my-leagues-state";
import {
  PLAYER_POSITION_PRESETS,
  POSITION_OTHER_VALUE,
} from "@/components/dashboard/forms/player/player-form-constants";
import {
  localIsoDateString,
  normalizeForSearch,
  teamDisplayLabel,
  teamMatchesQuery,
} from "@/components/dashboard/forms/player/player-form-utils";
import {
  PLAYER_CURP_MAX_FILE_BYTES,
  PLAYER_CURP_MIME_TYPES,
  PLAYER_PHOTO_MAX_FILE_BYTES,
  PLAYER_PHOTO_MIME_TYPES,
} from "@/components/dashboard/leagues/new-player-file-constraints";
import {
  DEFAULT_WHATSAPP_COUNTRY_ISO2,
  getCountryDialOptions,
} from "@/lib/phone/country-dial-options";

export type PlayerFormEditTarget = {
  leagueId: string;
  teamId: string;
  playerId: string;
};

export type UseNewPlayerFormParams = {
  teamRows: readonly MyLeaguesTeamRow[];
  onClose: () => void;
  onPlayerCreated?: () => void;
  onBusyChange?: (busy: boolean) => void;
  prefillTeamId?: string;
  editTarget?: PlayerFormEditTarget | null;
};

export type PlayerEditLoadState = "idle" | "loading" | "ready" | "error";

export function useNewPlayerForm({
  teamRows,
  onClose,
  onPlayerCreated,
  onBusyChange,
  prefillTeamId,
  editTarget = null,
}: UseNewPlayerFormParams) {
  const isEdit = Boolean(editTarget);
  const countryDialOptions = useMemo(() => getCountryDialOptions(), []);
  const birthDateMax = useMemo(() => localIsoDateString(), []);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const curpFileInputRef = useRef<HTMLInputElement>(null);
  const teamComboWrapRef = useRef<HTMLDivElement>(null);
  const teamSearchInputRef = useRef<HTMLInputElement>(null);
  const photoPreviewUrlRef = useRef<string | null>(null);

  const initialTeamId = useMemo<string>(() => {
    if (editTarget?.teamId && teamRows.some((t) => t.id === editTarget.teamId)) {
      return editTarget.teamId;
    }
    if (prefillTeamId && teamRows.some((t) => t.id === prefillTeamId)) {
      return prefillTeamId;
    }
    return teamRows.length === 1 ? teamRows[0]!.id : "";
  }, [editTarget, prefillTeamId, teamRows]);

  const [teamId, setTeamId] = useState<string>(initialTeamId);
  const [teamSearch, setTeamSearch] = useState<string>(() => {
    const t = teamRows.find((x) => x.id === initialTeamId);
    return t ? teamDisplayLabel(t) : "";
  });
  const [editLoadState, setEditLoadState] = useState<PlayerEditLoadState>(() =>
    isEdit ? "loading" : "ready",
  );
  const [editLoadError, setEditLoadError] = useState<string | null>(null);
  const [serverExistingPhotoUrl, setServerExistingPhotoUrl] = useState<string | null>(null);
  const [teamListOpen, setTeamListOpen] = useState(false);
  const [teamHighlight, setTeamHighlight] = useState(-1);

  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [shirtNumber, setShirtNumber] = useState("");
  const [positionPreset, setPositionPreset] = useState("");
  const [positionCustom, setPositionCustom] = useState("");
  const [whatsappCountryIso, setWhatsappCountryIso] = useState(DEFAULT_WHATSAPP_COUNTRY_ISO2);
  const [whatsappPhone, setWhatsappPhone] = useState("");

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [curpText, setCurpText] = useState("");
  const [curpFile, setCurpFile] = useState<File | null>(null);
  const [curpFileError, setCurpFileError] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const replacePhotoPreview = useCallback((next: string | null) => {
    if (photoPreviewUrlRef.current) {
      URL.revokeObjectURL(photoPreviewUrlRef.current);
      photoPreviewUrlRef.current = null;
    }
    photoPreviewUrlRef.current = next;
    setPhotoPreviewUrl(next);
  }, []);

  const selectedTeam = useMemo(
    () => teamRows.find((t) => t.id === teamId) ?? null,
    [teamRows, teamId],
  );

  const filteredTeams = useMemo(() => {
    const isShowingSelectedLabel =
      selectedTeam !== null && teamSearch === teamDisplayLabel(selectedTeam);
    const queryNorm = isShowingSelectedLabel ? "" : normalizeForSearch(teamSearch);
    if (!queryNorm) return teamRows;
    return teamRows.filter((t) => teamMatchesQuery(t, queryNorm));
  }, [teamRows, teamSearch, selectedTeam]);

  const teamRowsRef = useRef(teamRows);
  teamRowsRef.current = teamRows;

  const fetchEditLeagueId = editTarget?.leagueId ?? null;
  const fetchEditTeamId = editTarget?.teamId ?? null;
  const fetchEditPlayerId = editTarget?.playerId ?? null;

  useEffect(() => {
    onBusyChange?.(submitting);
  }, [submitting, onBusyChange]);

  useEffect(() => {
    return () => {
      onBusyChange?.(false);
    };
  }, [onBusyChange]);

  useEffect(() => {
    if (!fetchEditLeagueId || !fetchEditTeamId || !fetchEditPlayerId) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setEditLoadState("loading");
      setEditLoadError(null);
      setServerExistingPhotoUrl(null);
      setPhoto(null);
      replacePhotoPreview(null);
      setCurpText("");
      setCurpFile(null);
      setPhotoError(null);
      setCurpFileError(null);
      if (photoInputRef.current) photoInputRef.current.value = "";
      if (curpFileInputRef.current) curpFileInputRef.current.value = "";

      setTeamId(fetchEditTeamId);
      const rowTeam = teamRowsRef.current.find((t) => t.id === fetchEditTeamId);
      if (rowTeam) {
        setTeamSearch(teamDisplayLabel(rowTeam));
      }

      void (async () => {
        try {
          const res = await fetch(
            `/api/leagues/${encodeURIComponent(fetchEditLeagueId)}/teams/${encodeURIComponent(fetchEditTeamId)}/players/${encodeURIComponent(fetchEditPlayerId)}`,
          );
          let data: {
            player?: {
              fullName: string;
              docId?: string | null;
              birthDate: string;
              whatsappCountryIso: string;
              whatsappPhoneNational: string;
            };
            roster?: { shirtNumber: number | null; position: string | null };
            existingPhotoUrl?: string | null;
            error?: string;
          } = {};
          try {
            data = (await res.json()) as typeof data;
          } catch {
            /* ignore */
          }
          if (cancelled) return;
          if (res.status === 401) {
            window.location.href = "/";
            return;
          }
          if (!res.ok || !data.player || !data.roster) {
            setEditLoadError(
              typeof data.error === "string" ? data.error : "No se pudo cargar el jugador.",
            );
            setEditLoadState("error");
            return;
          }
          setFullName(data.player.fullName);
          setCurpText(data.player.docId ?? "");
          setBirthDate(data.player.birthDate);
          setShirtNumber(data.roster.shirtNumber == null ? "" : String(data.roster.shirtNumber));
          const pos = data.roster.position?.trim() ?? "";
          const presetMatch = PLAYER_POSITION_PRESETS.find((p) => p.value === pos);
          if (!pos) {
            setPositionPreset("");
            setPositionCustom("");
          } else if (presetMatch) {
            setPositionPreset(presetMatch.value);
            setPositionCustom("");
          } else {
            setPositionPreset(POSITION_OTHER_VALUE);
            setPositionCustom(pos);
          }
          setWhatsappCountryIso(
            data.player.whatsappCountryIso?.length === 2
              ? data.player.whatsappCountryIso.toUpperCase()
              : DEFAULT_WHATSAPP_COUNTRY_ISO2,
          );
          setWhatsappPhone(data.player.whatsappPhoneNational ?? "");
          const main = data.existingPhotoUrl;
          setServerExistingPhotoUrl(
            typeof main === "string" && main.trim() ? main.trim() : null,
          );
          setEditLoadState("ready");
        } catch {
          if (!cancelled) {
            setEditLoadError("Error de red al cargar el jugador.");
            setEditLoadState("error");
          }
        }
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [fetchEditLeagueId, fetchEditTeamId, fetchEditPlayerId, replacePhotoPreview]);

  useEffect(() => {
    if (!teamListOpen) return;
    function handler(e: MouseEvent) {
      const wrap = teamComboWrapRef.current;
      if (!wrap) return;
      if (!wrap.contains(e.target as Node)) {
        setTeamListOpen(false);
        setTeamHighlight(-1);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [teamListOpen]);

  const selectTeamRow = useCallback((t: MyLeaguesTeamRow) => {
    setTeamId(t.id);
    setTeamSearch(teamDisplayLabel(t));
    setTeamListOpen(false);
    setTeamHighlight(-1);
    setFieldErrors((prev) => {
      if (!prev.teamId) return prev;
      const next = { ...prev };
      delete next.teamId;
      return next;
    });
  }, []);

  const clearTeamSelection = useCallback(() => {
    if (prefillTeamId || isEdit) return;
    setTeamId("");
    setTeamSearch("");
    setTeamListOpen(true);
    setTeamHighlight(-1);
    teamSearchInputRef.current?.focus();
  }, [prefillTeamId, isEdit]);

  const onTeamSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setTeamListOpen(false);
        setTeamHighlight(-1);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setTeamListOpen(true);
        setTeamHighlight((i) =>
          filteredTeams.length === 0 ? -1 : Math.min(i + 1, filteredTeams.length - 1),
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setTeamHighlight((i) => (i <= 0 ? 0 : i - 1));
        return;
      }
      if (e.key === "Enter") {
        if (teamListOpen && teamHighlight >= 0 && teamHighlight < filteredTeams.length) {
          e.preventDefault();
          const t = filteredTeams[teamHighlight];
          if (t) selectTeamRow(t);
        }
      }
    },
    [filteredTeams, teamHighlight, teamListOpen, selectTeamRow],
  );

  const onPhotoChange = useCallback(
    (file: File | null) => {
      setPhotoError(null);
      if (!file) {
        setPhoto(null);
        replacePhotoPreview(null);
        return;
      }
      if (!PLAYER_PHOTO_MIME_TYPES.has(file.type)) {
        setPhoto(null);
        replacePhotoPreview(null);
        setPhotoError("Usa JPG, PNG o WebP.");
        return;
      }
      if (file.size > PLAYER_PHOTO_MAX_FILE_BYTES) {
        setPhoto(null);
        replacePhotoPreview(null);
        setPhotoError(
          `La foto supera ${Math.round(PLAYER_PHOTO_MAX_FILE_BYTES / (1024 * 1024))} MB.`,
        );
        return;
      }
      setPhoto(file);
      replacePhotoPreview(URL.createObjectURL(file));
    },
    [replacePhotoPreview],
  );

  const onCurpFileChange = useCallback((file: File | null) => {
    setCurpFileError(null);
    if (!file) {
      setCurpFile(null);
      return;
    }
    if (!PLAYER_CURP_MIME_TYPES.has(file.type)) {
      setCurpFile(null);
      setCurpFileError("Usa PDF, JPG, PNG o WebP.");
      return;
    }
    if (file.size > PLAYER_CURP_MAX_FILE_BYTES) {
      setCurpFile(null);
      setCurpFileError(
        `El archivo supera ${Math.round(PLAYER_CURP_MAX_FILE_BYTES / (1024 * 1024))} MB.`,
      );
      return;
    }
    setCurpFile(file);
  }, []);

  const resetForm = useCallback(() => {
    const resetTeamId = initialTeamId;
    setTeamId(resetTeamId);
    const t = teamRows.find((x) => x.id === resetTeamId);
    setTeamSearch(t ? teamDisplayLabel(t) : "");
    setTeamListOpen(false);
    setTeamHighlight(-1);
    setFullName("");
    setBirthDate("");
    setShirtNumber("");
    setPositionPreset("");
    setPositionCustom("");
    setWhatsappCountryIso(DEFAULT_WHATSAPP_COUNTRY_ISO2);
    setWhatsappPhone("");
    setPhoto(null);
    replacePhotoPreview(null);
    setCurpText("");
    setCurpFile(null);
    setPhotoError(null);
    setCurpFileError(null);
    setFieldErrors({});
    setSubmitError(null);
    setSubmitting(false);
    setServerExistingPhotoUrl(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
    if (curpFileInputRef.current) curpFileInputRef.current.value = "";
  }, [initialTeamId, teamRows, replacePhotoPreview]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFieldErrors({});
      setSubmitError(null);

      if (!teamId) {
        setFieldErrors({ teamId: "Selecciona un equipo." });
        return;
      }
      if (!selectedTeam) {
        setFieldErrors({ teamId: "El equipo seleccionado ya no está disponible." });
        return;
      }

      const positionToSubmit =
        positionPreset === POSITION_OTHER_VALUE ? positionCustom.trim() : positionPreset;

      if (positionPreset === POSITION_OTHER_VALUE && !positionToSubmit) {
        setFieldErrors({ position: "Captura la posición o elige una de la lista." });
        return;
      }

      setTeamListOpen(false);
      setTeamHighlight(-1);
      setSubmitting(true);

      const fd = new FormData();
      fd.set("fullName", fullName);
      fd.set("birthDate", birthDate);
      fd.set("shirtNumber", shirtNumber);
      fd.set("position", positionToSubmit);
      fd.set("whatsappCountryIso", whatsappCountryIso);
      fd.set("whatsappPhoneNational", whatsappPhone);
      fd.set("docId", curpText.trim());
      if (photo) fd.set("photo", photo);
      if (curpFile) fd.set("curp", curpFile);

      try {
        const url = isEdit
          ? `/api/leagues/${encodeURIComponent(selectedTeam.leagueId)}/teams/${encodeURIComponent(selectedTeam.id)}/players/${encodeURIComponent(editTarget!.playerId)}`
          : `/api/leagues/${encodeURIComponent(selectedTeam.leagueId)}/teams/${encodeURIComponent(selectedTeam.id)}/players`;
        const res = await fetch(url, { method: isEdit ? "PATCH" : "POST", body: fd });

        let data: { error?: string; fields?: Record<string, string> } = {};
        try {
          data = (await res.json()) as typeof data;
        } catch {
          /* ignore */
        }

        if (res.status === 401) {
          window.location.href = "/";
          return;
        }

        if (!res.ok) {
          if (data.fields && typeof data.fields === "object") {
            setFieldErrors(data.fields);
          }
          setSubmitError(
            typeof data.error === "string"
              ? data.error
              : isEdit
                ? "No se pudo actualizar al jugador. Inténtalo de nuevo."
                : "No se pudo agregar al jugador. Inténtalo de nuevo.",
          );
          return;
        }

        onPlayerCreated?.();
        if (!isEdit) {
          resetForm();
        }
        onClose();
      } finally {
        setSubmitting(false);
      }
    },
    [
      teamId,
      selectedTeam,
      positionPreset,
      positionCustom,
      fullName,
      birthDate,
      shirtNumber,
      whatsappCountryIso,
      whatsappPhone,
      curpText,
      photo,
      curpFile,
      isEdit,
      editTarget,
      onPlayerCreated,
      resetForm,
      onClose,
    ],
  );

  const displayPhotoUrl = photoPreviewUrl ?? serverExistingPhotoUrl;
  const lockTeamSelection = Boolean(prefillTeamId) || isEdit;

  return {
    isEdit,
    countryDialOptions,
    birthDateMax,
    photoInputRef,
    curpFileInputRef,
    teamComboWrapRef,
    teamSearchInputRef,
    teamId,
    setTeamId,
    teamSearch,
    setTeamSearch,
    teamListOpen,
    setTeamListOpen,
    teamHighlight,
    setTeamHighlight,
    filteredTeams,
    selectedTeam,
    fullName,
    setFullName,
    birthDate,
    setBirthDate,
    shirtNumber,
    setShirtNumber,
    positionPreset,
    setPositionPreset,
    positionCustom,
    setPositionCustom,
    whatsappCountryIso,
    setWhatsappCountryIso,
    setWhatsappPhone,
    whatsappPhone,
    curpText,
    setCurpText,
    curpFile,
    curpFileError,
    photoError,
    displayPhotoUrl,
    fieldErrors,
    submitError,
    submitting,
    editLoadError,
    showNoTeams: teamRows.length === 0,
    showEditLoading: isEdit && editLoadState === "loading",
    showEditError: isEdit && editLoadState === "error",
    lockTeamSelection,
    selectTeamRow,
    clearTeamSelection,
    onTeamSearchKeyDown,
    onPhotoChange,
    onCurpFileChange,
    resetForm,
    handleSubmit,
  };
}
