export interface ConfigRequirement {
    key: string;
    secret?: boolean;
    requiredInProduction?: boolean;
}
export declare function validateOperationalConfig(env: Record<string, string | undefined>, requirements: ConfigRequirement[]): {
    ok: boolean;
    missing: string[];
    insecure: string[];
};
