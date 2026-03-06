import { ProviderError } from "../../errors.js";
import { normalizeHttpUrl } from "../../normalization/urls.js";
import type { Plan } from "../../plan.js";
import { planId } from "../../plan.js";
import { validatePlanArray } from "../../planValidation.js";
import type { PlanProvider, ProviderContext } from "../../provider.js";
import type { SearchPlansInput, SearchPlansResult } from "../../types.js";
import { validateSearchPlansInput } from "../../validation.js";
import { MOVIES_CACHE_DEFAULTS, MoviesCache, buildNowPlayingCacheKey, buildTheatersCacheKey } from "./cache.js";
import { TheatersClient } from "./theatersClient.js";
import { TmdbClient, type TmdbMovieLite } from "./tmdbClient.js";

const DEFAULT_TIMEOUT_MS = 2_500;
const DEFAULT_MAX_MOVIES = 30;
const DEFAULT_MAX_THEATERS = 20;

export interface MoviesProviderOptions {
  tmdbApiKey?: string;
  googleApiKey?: string;
  yelpApiKey?: string;
  language?: string;
  region?: string;
  timeoutMs?: number;
  maxMovies?: number;
  maxTheaters?: number;
  includeTheaters?: boolean;
  includeMovieShowtimeLinks?: boolean;
  cache?: MoviesCache;
  moviesTtlMs?: number;
  theatersTtlMs?: number;
}

interface CursorPayload {
  offset: number;
}

function truncate(value: string | undefined, maxLength: number): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}…` : trimmed;
}

function deriveRegion(locale: string | undefined, fallback: string): string {
  if (!locale) {
    return fallback;
  }
  const match = locale.trim().match(/^[a-z]{2,3}[-_]([A-Za-z]{2}|\d{3})$/i);
  if (!match) {
    return fallback;
  }
  return match[1].toUpperCase();
}

function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ offset } satisfies CursorPayload), "utf8").toString("base64");
}

function decodeCursor(cursor: string | null | undefined): number {
  if (!cursor) {
    return 0;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64").toString("utf8")) as CursorPayload;
    if (typeof parsed.offset === "number" && Number.isInteger(parsed.offset) && parsed.offset >= 0) {
      return parsed.offset;
    }
  } catch {
    return 0;
  }

  return 0;
}

function buildMovieShowtimesLink(title: string, lat: number, lng: number): string {
  const params = new URLSearchParams({
    api: "1",
    query: `${title} showtimes`,
    center: `${lat},${lng}`
  });

  return `https://www.google.com/maps/search/?${params.toString()}`;
}

export class MoviesProvider implements PlanProvider {
  public readonly name = "movies";
  private readonly opts: MoviesProviderOptions;
  private readonly fetchFn: typeof fetch;
  private readonly now: () => number;
  private readonly cache: MoviesCache;

  constructor(opts?: MoviesProviderOptions, extra?: { fetchFn?: typeof fetch; now?: () => number }) {
    this.opts = opts ?? {};
    this.fetchFn = extra?.fetchFn ?? fetch;
    this.now = extra?.now ?? (() => Date.now());
    this.cache = opts?.cache ?? new MoviesCache();
  }

  public async searchPlans(input: SearchPlansInput, ctx?: ProviderContext): Promise<SearchPlansResult> {
    if (ctx?.signal?.aborted) {
      throw new ProviderError({ provider: "movies", code: "ABORTED", message: "Movies request aborted", retryable: true });
    }

    const startedAt = this.now();
    const normalizedInput = validateSearchPlansInput(input);

    if (normalizedInput.categories && !normalizedInput.categories.includes("movies")) {
      return {
        plans: [],
        nextCursor: null,
        source: "movies",
        debug: {
          tookMs: this.now() - startedAt,
          returned: 0
        }
      };
    }

    const timeoutMs = Math.max(1, Math.min(this.opts.timeoutMs ?? DEFAULT_TIMEOUT_MS, ctx?.timeoutMs ?? Number.POSITIVE_INFINITY));
    const localeLanguage = normalizedInput.locale?.trim() || this.opts.language || "en-US";
    const localeRegion = deriveRegion(normalizedInput.locale, this.opts.region ?? "US");

    const tmdbApiKey =
      this.opts.tmdbApiKey ??
      ctx?.config?.plans.providers.tmdb?.secrets?.apiKey ??
      ctx?.config?.plans.providers.movies?.secrets?.apiKey;

    const googleApiKey =
      this.opts.googleApiKey ??
      ctx?.config?.plans.providers.google?.secrets?.apiKey ??
      ctx?.config?.plans.providers.places?.secrets?.apiKey;

    const yelpApiKey =
      this.opts.yelpApiKey ??
      ctx?.config?.plans.providers.yelp?.secrets?.apiKey ??
      ctx?.config?.plans.providers.places?.secrets?.apiKey;

    const moviesTtlMs = this.opts.moviesTtlMs ?? MOVIES_CACHE_DEFAULTS.moviesTtlMs;
    const theatersTtlMs = this.opts.theatersTtlMs ?? MOVIES_CACHE_DEFAULTS.theatersTtlMs;

    const maxMovies = Math.max(1, Math.min(50, this.opts.maxMovies ?? DEFAULT_MAX_MOVIES));
    const maxTheaters = Math.max(1, Math.min(20, this.opts.maxTheaters ?? DEFAULT_MAX_THEATERS));
    const includeTheaters = this.opts.includeTheaters ?? true;
    const includeMovieShowtimeLinks = this.opts.includeMovieShowtimeLinks ?? true;

    let moviesPlans: Plan[] = [];
    let theatersPlans: Plan[] = [];
    let moviesError: ProviderError | null = null;
    let theatersError: ProviderError | null = null;

    if (tmdbApiKey) {
      const movieCacheKey = buildNowPlayingCacheKey(localeLanguage, localeRegion);
      const cachedMovies = this.cache.getNowPlaying(movieCacheKey, this.now());
      if (cachedMovies) {
        moviesPlans = cachedMovies;
      } else {
        try {
          const tmdbClient = new TmdbClient(
            {
              apiKey: tmdbApiKey,
              timeoutMs,
              language: localeLanguage,
              region: localeRegion,
              page: 1
            },
            { fetchFn: this.fetchFn }
          );

          const response = await tmdbClient.nowPlaying({ signal: ctx?.signal });
          const normalizedMovies = response.results
            .map((movie) => this.tmdbMovieToPlan(movie, normalizedInput.location.lat, normalizedInput.location.lng, includeMovieShowtimeLinks))
            .filter((plan): plan is Plan => plan !== null);

          const validated = validatePlanArray(normalizedMovies);
          moviesPlans = [...validated]
            .sort((a, b) => {
              const aVotes = typeof a.reviewCount === "number" ? a.reviewCount : 0;
              const bVotes = typeof b.reviewCount === "number" ? b.reviewCount : 0;
              if (aVotes !== bVotes) {
                return bVotes - aVotes;
              }
              const aRating = typeof a.rating === "number" ? a.rating : 0;
              const bRating = typeof b.rating === "number" ? b.rating : 0;
              if (aRating !== bRating) {
                return bRating - aRating;
              }
              return a.title.localeCompare(b.title);
            })
            .slice(0, maxMovies);

          this.cache.setNowPlaying(movieCacheKey, moviesPlans, this.now(), moviesTtlMs);
        } catch (error) {
          if (error instanceof ProviderError) {
            moviesError = error;
          } else {
            moviesError = new ProviderError({
              provider: "tmdb",
              code: "UNKNOWN",
              message: "TMDB failed",
              retryable: false,
              cause: error
            });
          }
        }
      }
    }

    if (includeTheaters) {
      const theaterCacheKey = buildTheatersCacheKey(
        normalizedInput.location.lat,
        normalizedInput.location.lng,
        normalizedInput.radiusMeters,
        normalizedInput.openNow
      );
      const cachedTheaters = this.cache.getTheaters(theaterCacheKey, this.now());
      if (cachedTheaters) {
        theatersPlans = cachedTheaters;
      } else {
        try {
          const theatersClient = new TheatersClient({ googleApiKey, yelpApiKey, timeoutMs, fetchFn: this.fetchFn });
          const found = await theatersClient.search(
            {
              lat: normalizedInput.location.lat,
              lng: normalizedInput.location.lng,
              radiusMeters: normalizedInput.radiusMeters,
              openNow: normalizedInput.openNow,
              limit: maxTheaters,
              locale: normalizedInput.locale
            },
            { signal: ctx?.signal }
          );

          theatersPlans = validatePlanArray(
            found.map((plan) => ({
              ...plan,
              metadata: {
                ...(plan.metadata ?? {}),
                kind: (plan.metadata?.kind as string | undefined) ?? "theater"
              }
            }))
          )
            .sort((a, b) => {
              const aDistance = typeof a.distanceMeters === "number" ? a.distanceMeters : Number.POSITIVE_INFINITY;
              const bDistance = typeof b.distanceMeters === "number" ? b.distanceMeters : Number.POSITIVE_INFINITY;
              if (aDistance !== bDistance) {
                return aDistance - bDistance;
              }
              const aRating = typeof a.rating === "number" ? a.rating : 0;
              const bRating = typeof b.rating === "number" ? b.rating : 0;
              if (aRating !== bRating) {
                return bRating - aRating;
              }
              return a.title.localeCompare(b.title);
            })
            .slice(0, maxTheaters);

          this.cache.setTheaters(theaterCacheKey, theatersPlans, this.now(), theatersTtlMs);
        } catch (error) {
          if (error instanceof ProviderError) {
            theatersError = error;
          } else {
            theatersError = new ProviderError({
              provider: "theaters",
              code: "UNKNOWN",
              message: "Theaters lookup failed",
              retryable: false,
              cause: error
            });
          }
        }
      }
    }

    if (moviesPlans.length === 0 && theatersPlans.length === 0 && (moviesError || theatersError)) {
      throw new ProviderError({
        provider: "movies",
        code: "ALL_SOURCES_FAILED",
        message: "All movie sources failed",
        retryable: Boolean(moviesError?.retryable || theatersError?.retryable),
        cause: { moviesError, theatersError }
      });
    }

    const combined = [...moviesPlans, ...theatersPlans];
    const offset = decodeCursor(normalizedInput.cursor);
    const limited = combined.slice(offset, offset + normalizedInput.limit);
    const nextOffset = offset + limited.length;

    return {
      plans: limited,
      nextCursor: nextOffset < combined.length ? encodeCursor(nextOffset) : null,
      source: "movies",
      debug: {
        tookMs: this.now() - startedAt,
        returned: limited.length
      }
    };
  }

  private tmdbMovieToPlan(movie: TmdbMovieLite, lat: number, lng: number, includeMovieShowtimeLinks: boolean): Plan | null {
    const title = movie.title?.trim();
    if (!title) {
      return null;
    }

    const sourceId = String(movie.id);
    const rating = typeof movie.vote_average === "number" ? Math.max(0, Math.min(5, movie.vote_average / 2)) : undefined;
    const website = normalizeHttpUrl(`https://www.themoviedb.org/movie/${movie.id}`);

    return {
      id: planId("tmdb", sourceId),
      source: "tmdb",
      sourceId,
      title,
      category: "movies",
      description: truncate(movie.overview, 400),
      location: {
        lat,
        lng
      },
      rating,
      reviewCount: typeof movie.vote_count === "number" ? Math.max(0, Math.round(movie.vote_count)) : undefined,
      photos: [
        movie.poster_path ? { url: `https://image.tmdb.org/t/p/w500${movie.poster_path}` } : null,
        movie.backdrop_path ? { url: `https://image.tmdb.org/t/p/w780${movie.backdrop_path}` } : null
      ].filter((photo): photo is NonNullable<Plan["photos"]>[number] => photo !== null),
      deepLinks: {
        websiteLink: website,
        mapsLink: includeMovieShowtimeLinks ? buildMovieShowtimesLink(title, lat, lng) : undefined
      },
      metadata: {
        kind: "movie",
        releaseDate: movie.release_date
      }
    };
  }
}
