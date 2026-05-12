export type MyLeaguesApiItem = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

export type DashboardMyLeaguesState =
  | { status: "loading" }
  | { status: "error"; message: string; onRetry: () => void }
  | { status: "ready"; items: readonly MyLeaguesApiItem[] };
