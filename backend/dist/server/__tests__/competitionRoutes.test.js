import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from '../index.js';
const serversToClose = [];
afterEach(async () => {
    await Promise.all(serversToClose.splice(0).map((server) => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))));
});
async function boot() {
    const server = createServer();
    serversToClose.push(server);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const address = server.address();
    if (!address || typeof address === 'string')
        throw new Error('expected tcp address');
    return `http://127.0.0.1:${address.port}`;
}
describe('competition routes', () => {
    it('serves home, missions, leaderboards, quality, and rewards flows', async () => {
        const baseUrl = await boot();
        const home = await fetch(`${baseUrl}/v1/competition/home`, { headers: { 'x-user-id': 'u1' } });
        expect(home.status).toBe(200);
        const homeJson = await home.json();
        expect(homeJson.missions.length).toBeGreaterThan(0);
        const missionProgress = await fetch(`${baseUrl}/v1/competition/missions/${homeJson.missions[0].id}/progress`, { headers: { 'x-user-id': 'u1' } });
        expect(missionProgress.status).toBe(200);
        const leaderboards = await fetch(`${baseUrl}/v1/competition/leaderboards`, { headers: { 'x-user-id': 'u1' } });
        expect(leaderboards.status).toBe(200);
        const quality = await fetch(`${baseUrl}/v1/competition/videos/video_seed_1/quality`);
        expect(quality.status).toBe(200);
        const qualityJson = await quality.json();
        expect(qualityJson.quality.earlyLikeCount).toBe(1);
        const missionClaim = await fetch(`${baseUrl}/v1/competition/missions/daily_approved_review/claim`, { method: 'POST', headers: { 'x-user-id': 'u1' } });
        expect(missionClaim.status).toBe(200);
        const missionClaimJson = await missionClaim.json();
        const rewardClaim = await fetch(`${baseUrl}/v1/competition/rewards/${missionClaimJson.reward.id}/claim`, { method: 'POST', headers: { 'x-user-id': 'u1' } });
        expect(rewardClaim.status).toBe(200);
        const audit = await fetch(`${baseUrl}/v1/admin/competition/audit`);
        expect(audit.status).toBe(200);
    });
});
