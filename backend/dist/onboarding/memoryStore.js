export class MemoryOnboardingStore {
    rows = new Map();
    async get(userId) {
        return this.rows.get(userId);
    }
    async save(pref) {
        this.rows.set(pref.userId, pref);
        return pref;
    }
}
