import { ProviderError, RateLimitError, TimeoutError } from "../../errors.js";
import { isAbortError } from "../../provider.js";
import { NoScrapePolicy, defaultNoScrapePolicy } from "../../../policy/noScrapePolicy.js";
import { createPolicyFetch } from "../../../policy/policyFetch.js";

const TMDB_NOW_PLAYING_URL = "https://api.themoviedb.org/3/movie/now_playing";

export interface TmdbConfig {
  apiKey: string;
  timeoutMs: number;
  language?: string;
  region?: string;
  page?: number;
}

export interface TmdbMovieLite {
  id: number;
  title?: string;
  overview?: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  vote_count?: number;
}

interface TmdbNowPlayingResponse {
  results?: TmdbMovieLite[];
}

function createCombinedController(signal: AbortSignal | undefined, timeoutMs: number): {
  controller: AbortController;
  cleanup: () => void;
  didTimeout: () => boolean;
} {
  const controller = new AbortController();
  let timeoutTriggered = false;

  const onAbort = (): void => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason);
    } else {
      signal.addEventListener("abort", onAbort, { once: true });
    }
  }

  const timeoutId = setTimeout(() => {
    timeoutTriggered = true;
    controller.abort(new DOMException("Request timed out", "AbortError"));
  }, timeoutMs);

  return {
    controller,
    cleanup: () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onAbort);
    },
    didTimeout: () => timeoutTriggered
  };
}

export class TmdbClient {
  private readonly cfg: TmdbConfig;
  private readonly fetchFn: typeof fetch;

  constructor(cfg: TmdbConfig, opts?: { fetchFn?: typeof fetch; policy?: NoScrapePolicy }) {
    this.cfg = cfg;
    const policy = opts?.policy ?? new NoScrapePolicy(defaultNoScrapePolicy());
    this.fetchFn = createPolicyFetch({ policy, kind: "api", fetchFn: opts?.fetchFn ?? fetch });
  }

  public async nowPlaying(ctx?: { signal?: AbortSignal }): Promise<{ results: TmdbMovieLite[] }> {
    const combined = createCombinedController(ctx?.signal, this.cfg.timeoutMs);
    const query = new URLSearchParams({
      api_key: this.cfg.apiKey,
      language: this.cfg.language ?? "en-US",
      region: this.cfg.region ?? "US",
      page: String(this.cfg.page ?? 1)
    });

    try {
      const response = await this.fetchFn(`${TMDB_NOW_PLAYING_URL}?${query.toString()}`, {
        method: "GET",
        signal: combined.controller.signal
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new RateLimitError("tmdb");
        }
        if (response.status === 408 || response.status === 504) {
          throw new TimeoutError("tmdb");
        }
        throw new ProviderError({
          provider: "tmdb",
          code: `HTTP_${response.status}`,
          message: `TMDB request failed with status ${response.status}`,
          retryable: false
        });
      }

      const data = (await response.json()) as TmdbNowPlayingResponse;
      const results = (data.results ?? []).filter(
        (movie): movie is TmdbMovieLite & { id: number } => typeof movie.id === "number" && Number.isFinite(movie.id)
      );

      return { results };
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      if (combined.didTimeout() || isAbortError(error)) {
        throw new TimeoutError("tmdb", "TMDB request timed out", error);
      }
      throw new ProviderError({
        provider: "tmdb",
        code: "HTTP_ERROR",
        message: "TMDB request failed",
        retryable: false,
        cause: error
      });
    } finally {
      combined.cleanup();
    }
  }
}
