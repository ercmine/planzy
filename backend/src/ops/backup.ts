export interface BackupRecord {
  id: string;
  system: "main_db" | "geo_db" | "redis" | "media_metadata";
  createdAt: string;
  backupType: "full" | "incremental";
  storageUri: string;
  checksumSha256?: string;
  sizeBytes?: number;
  status: "succeeded" | "failed";
  errorMessage?: string;
}

export interface BackupPolicy {
  retentionDays: number;
  maxBackupAgeHours: number;
}

export function applyRetention(records: BackupRecord[], nowIso: string, policy: BackupPolicy): BackupRecord[] {
  const cutoff = new Date(nowIso).getTime() - policy.retentionDays * 86_400_000;
  return records.filter((item) => new Date(item.createdAt).getTime() >= cutoff).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function evaluateBackupReadiness(records: BackupRecord[], nowIso: string, policy: BackupPolicy): {
  ok: boolean;
  staleSystems: string[];
  failingSystems: string[];
} {
  const systems = new Set(records.map((item) => item.system));
  const staleSystems: string[] = [];
  const failingSystems: string[] = [];
  const nowMs = new Date(nowIso).getTime();

  for (const system of systems) {
    const latest = records
      .filter((item) => item.system === system)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

    if (!latest) {
      staleSystems.push(system);
      continue;
    }

    const ageHours = (nowMs - new Date(latest.createdAt).getTime()) / 3_600_000;
    if (ageHours > policy.maxBackupAgeHours) staleSystems.push(system);
    if (latest.status !== "succeeded") failingSystems.push(system);
  }

  return { ok: staleSystems.length === 0 && failingSystems.length === 0, staleSystems, failingSystems };
}

export function buildBackupManifest(records: BackupRecord[]): string {
  const body = {
    version: 1,
    generatedAt: new Date().toISOString(),
    backups: records.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  };
  return JSON.stringify(body, null, 2);
}
