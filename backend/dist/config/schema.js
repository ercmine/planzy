import { defaultAffiliateConfig } from "../affiliate/config.js";
import { defaultRetentionConfig } from "../retention/policy.js";
export function defaultConfig(env) {
    return {
        env,
        affiliate: defaultAffiliateConfig(),
        retention: defaultRetentionConfig(),
        remoteConfig: {
            ttlMs: 60_000,
            timeoutMs: 2_000,
            allowInsecureHttp: false
        },
        geocoding: {
            timeoutMs: 2_000,
            geocodeCacheTtlMs: 3_600_000,
            reverseCacheTtlMs: 86_400_000,
            defaultLimit: 5,
            enableFallback: false,
            userAgent: "dryad-geocoder/1.0"
        },
        plans: {
            router: {
                defaultTimeoutMs: 2_500,
                allowPartial: true
            },
            providers: {
                stub: {
                    name: "stub",
                    routing: {
                        enabled: true
                    },
                    budget: {
                        timeoutMs: 2_500,
                        maxConcurrent: 10
                    },
                    cache: {
                        ttlMs: 30_000,
                        staleWhileRevalidateMs: 5_000
                    },
                    quota: {
                        requestsPerMinute: 120,
                        requestsPerDay: 100_000,
                        burst: 20
                    }
                }
            }
        }
    };
}
