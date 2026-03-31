export class MemoryWalletAuthStore {
    challenges = new Map();
    identities = new Map();
    identitiesByUser = new Map();
    sessionsByToken = new Map();
    sessionsById = new Map();
    events = [];
    saveChallenge(challenge) {
        this.challenges.set(challenge.id, structuredClone(challenge));
    }
    getChallenge(challengeId) {
        const challenge = this.challenges.get(challengeId);
        return challenge ? structuredClone(challenge) : undefined;
    }
    saveIdentity(identity) {
        const key = this.identityKey(identity.chain, identity.normalizedAddress);
        this.identities.set(key, structuredClone(identity));
        const ids = new Set(this.identitiesByUser.get(identity.userId) ?? []);
        ids.add(identity.id);
        this.identitiesByUser.set(identity.userId, [...ids]);
    }
    getIdentityByAddress(chain, normalizedAddress) {
        const identity = this.identities.get(this.identityKey(chain, normalizedAddress));
        return identity ? structuredClone(identity) : undefined;
    }
    listIdentitiesByUser(userId) {
        const ids = this.identitiesByUser.get(userId) ?? [];
        return ids
            .map((id) => [...this.identities.values()].find((entry) => entry.id === id))
            .filter((entry) => Boolean(entry))
            .map((entry) => structuredClone(entry));
    }
    saveSession(session) {
        const cloned = structuredClone(session);
        this.sessionsByToken.set(session.token, cloned);
        this.sessionsById.set(session.id, cloned);
    }
    getSessionByToken(token) {
        const session = this.sessionsByToken.get(token);
        return session ? structuredClone(session) : undefined;
    }
    revokeSession(sessionId, revokedAt) {
        const session = this.sessionsById.get(sessionId);
        if (!session)
            return;
        session.revokedAt = revokedAt;
        this.saveSession(session);
    }
    saveVerificationEvent(event) {
        this.events.unshift(structuredClone(event));
        if (this.events.length > 200)
            this.events.length = 200;
    }
    listVerificationEvents(limit) {
        return this.events.slice(0, limit).map((item) => structuredClone(item));
    }
    identityKey(chain, normalizedAddress) {
        return `${chain}:${normalizedAddress}`;
    }
}
