export interface ConfigRequirement {
  key: string;
  secret?: boolean;
  requiredInProduction?: boolean;
}

export function validateOperationalConfig(
  env: Record<string, string | undefined>,
  requirements: ConfigRequirement[]
): { ok: boolean; missing: string[]; insecure: string[] } {
  const missing: string[] = [];
  const insecure: string[] = [];

  for (const requirement of requirements) {
    const value = env[requirement.key];
    if (requirement.requiredInProduction !== false && !value) {
      missing.push(requirement.key);
      continue;
    }
    if (requirement.secret && value && ["changeme", "dev", "test", "insecure"].includes(value.toLowerCase())) {
      insecure.push(requirement.key);
    }
  }

  return { ok: missing.length === 0 && insecure.length === 0, missing, insecure };
}
