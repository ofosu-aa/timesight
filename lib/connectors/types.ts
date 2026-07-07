import { ExternalItem } from "../types";

/* Generic connector interface. Every provider (Google Calendar, Notion,
   Apple Calendar fallback, mock) implements this shape so the Connectors
   screen and import flow don't care which service is behind it. */
export interface ConnectorProvider {
  id: string;
  name: string;
  description: string;
  /** "ready" = usable now; "needs_oauth" = requires server OAuth config; "fallback" = alternate path (e.g. .ics) */
  availability: "ready" | "needs_oauth" | "fallback" | "coming_soon";
  connect(): Promise<{ ok: boolean; message: string }>;
  disconnect(): Promise<void>;
  sync(): Promise<ExternalItem[]>;
}
