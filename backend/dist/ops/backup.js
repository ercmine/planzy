export function applyRetention(records, nowIso, policy) {
    const cutoff = new Date(nowIso).getTime() - policy.retentionDays * 86_400_000;
    return records.filter((item) => new Date(item.createdAt).getTime() >= cutoff).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function evaluateBackupReadiness(records, nowIso, policy) {
    const systems = new Set(records.map((item) => item.system));
    const staleSystems = [];
    const failingSystems = [];
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
        if (ageHours > policy.maxBackupAgeHours)
            staleSystems.push(system);
        if (latest.status !== "succeeded")
            failingSystems.push(system);
    }
    return { ok: staleSystems.length === 0 && failingSystems.length === 0, staleSystems, failingSystems };
}
export function buildBackupManifest(records) {
    const body = {
        version: 1,
        generatedAt: new Date().toISOString(),
        backups: records.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    };
    return JSON.stringify(body, null, 2);
}
