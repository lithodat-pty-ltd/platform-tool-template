import { authorizedFetch, type TokenSource } from "./usePlatformToken";

/** Production EarthBank origin. No path. */
export const EARTHBANK_ORIGIN = "https://app.ausgeochem.org";

/** Pages read in one `listAll` call before it stops, so a full page every time cannot loop forever. */
const MAX_PAGES = 500;

export type QueryValue = string | number | boolean | null | undefined | readonly (string | number)[];

export type Query = Readonly<Record<string, QueryValue>>;

export interface ListAllOptions {
  /** Page size sent as `size`. Defaults to 200, or to `size` already on the query. */
  size?: number;
}

export class PlatformApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "PlatformApiError";
    this.status = status;
  }
}

export interface PlatformApi {
  /** Origin with no trailing slash. */
  readonly origin: string;
  getJson<T>(path: string, query?: Query): Promise<T>;
  postJson<T>(path: string, body?: unknown, query?: Query): Promise<T>;
  /**
   * Follows `page` until a short page comes back.
   * When the response carries `X-Total-Count`, stops once that many rows are collected.
   */
  listAll<T>(path: string, query?: Query, options?: ListAllOptions): Promise<T[]>;
}

/**
 * Fetch that attaches `Authorization: Bearer` when the host supplied a token.
 * Public EarthBank reads succeed with no JWT, so a missing token is not an error.
 * A blank token still fails: the host meant to authenticate and did not.
 */
export async function platformFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  source: TokenSource,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  if (source == null) return fetchImpl(input, init);
  return authorizedFetch(input, init, source, fetchImpl);
}

/**
 * JSON client for the EarthBank API.
 * `baseUrl` defaults to {@link EARTHBANK_ORIGIN}. Pass `props.apiBaseUrl` from the host.
 */
export function createPlatformApi(source: TokenSource, baseUrl: string = EARTHBANK_ORIGIN, fetchImpl: typeof fetch = fetch): PlatformApi {
  const origin = (baseUrl.trim() || EARTHBANK_ORIGIN).replace(/\/+$/, "");

  async function request<T>(path: string, method: "GET" | "POST", query: Query | undefined, body?: unknown): Promise<{ data: T; response: Response }> {
    const url = new URL(path, `${origin}/`);
    appendQuery(url, query);
    const init: RequestInit = { method };
    if (body !== undefined) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(body);
    }
    const response = await platformFetch(url, init, source, fetchImpl);
    return { data: await readJson<T>(response), response };
  }

  return {
    origin,
    async getJson<T>(path: string, query?: Query): Promise<T> {
      const { data } = await request<T>(path, "GET", query);
      return data;
    },
    async postJson<T>(path: string, body?: unknown, query?: Query): Promise<T> {
      const { data } = await request<T>(path, "POST", query, body ?? {});
      return data;
    },
    async listAll<T>(path: string, query?: Query, options?: ListAllOptions): Promise<T[]> {
      const size = options?.size ?? numberOrUndefined(query?.size) ?? 200;
      const rows: T[] = [];
      let total: number | null = null;
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const { data, response } = await request<T[]>(path, "GET", { ...query, page, size });
        if (total == null) total = totalCount(response);
        if (!Array.isArray(data) || data.length === 0) return rows;
        rows.push(...data);
        if (total != null && rows.length >= total) return rows;
        if (data.length < size) return rows;
      }
      throw new PlatformApiError(0, "Paged list did not end.");
    },
  };
}

function appendQuery(url: URL, query: Query | undefined): void {
  if (!query) return;
  for (const [key, value] of Object.entries(query)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, String(item));
    } else {
      url.searchParams.set(key, String(value));
    }
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) {
    throw new PlatformApiError(response.status, problemMessage(response.status, text));
  }
  if (text.trim() === "") return undefined as T;
  return JSON.parse(text) as T;
}

function problemMessage(status: number, text: string): string {
  try {
    const body: unknown = JSON.parse(text);
    if (body && typeof body === "object") {
      const record = body as { detail?: unknown; title?: unknown };
      if (typeof record.detail === "string" && record.detail.trim()) return clip(record.detail);
      if (typeof record.title === "string" && record.title.trim()) return clip(record.title);
    }
  } catch {
    // The body was not problem+json.
  }
  return `Request failed (${status}).`;
}

function clip(value: string): string {
  const text = value.trim();
  return text.length > 300 ? `${text.slice(0, 300)}…` : text;
}

function totalCount(response: Response): number | null {
  const header = response.headers.get("X-Total-Count");
  if (header == null || header.trim() === "") return null;
  const count = Number(header);
  return Number.isFinite(count) ? count : null;
}

function numberOrUndefined(value: QueryValue | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
