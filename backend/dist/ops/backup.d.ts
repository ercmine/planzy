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
export declare function applyRetention(records: BackupRecord[], nowIso: string, policy: BackupPolicy): BackupRecord[];
export declare function evaluateBackupReadiness(records: BackupRecord[], nowIso: string, policy: BackupPolicy): {
    ok: boolean;
    staleSystems: string[];
    failingSystems: string[];
};
export declare function buildBackupManifest(records: BackupRecord[]): string;
