export class MemoryPerbugWorldStore {
    states = new Map();
    savePlayerState(state) {
        this.states.set(state.userId, cloneState(state));
    }
    getPlayerState(userId) {
        const current = this.states.get(userId);
        return current ? cloneState(current) : undefined;
    }
}
function cloneState(state) {
    return {
        ...state,
        visitedNodeIds: [...state.visitedNodeIds],
        movementHistory: state.movementHistory.map((item) => ({ ...item })),
        progression: {
            ...state.progression,
            inventory: { ...state.progression.inventory },
            completedNodeIds: [...state.progression.completedNodeIds],
            missionProgress: { ...state.progression.missionProgress },
            unlocks: [...state.progression.unlocks]
        },
        squad: {
            ...state.squad,
            units: state.squad.units.map((unit) => ({ ...unit }))
        },
        activeEncounter: state.activeEncounter
            ? {
                ...state.activeEncounter,
                moduleState: { ...state.activeEncounter.moduleState },
                contextSnapshot: { ...state.activeEncounter.contextSnapshot },
                rewardPreview: {
                    ...state.activeEncounter.rewardPreview,
                    resources: { ...state.activeEncounter.rewardPreview.resources },
                    unlocks: [...(state.activeEncounter.rewardPreview.unlocks ?? [])],
                    missionProgress: { ...(state.activeEncounter.rewardPreview.missionProgress ?? {}) }
                },
                debug: {
                    ...state.activeEncounter.debug,
                    payload: { ...state.activeEncounter.debug.payload },
                    transitions: state.activeEncounter.debug.transitions.map((t) => ({ ...t }))
                }
            }
            : undefined,
        encounterHistory: state.encounterHistory.map((enc) => ({
            ...enc,
            moduleState: { ...enc.moduleState },
            contextSnapshot: { ...enc.contextSnapshot },
            rewardPreview: {
                ...enc.rewardPreview,
                resources: { ...enc.rewardPreview.resources },
                unlocks: [...(enc.rewardPreview.unlocks ?? [])],
                missionProgress: { ...(enc.rewardPreview.missionProgress ?? {}) }
            },
            debug: {
                ...enc.debug,
                payload: { ...enc.debug.payload },
                transitions: enc.debug.transitions.map((t) => ({ ...t }))
            }
        })),
        nodeProgress: Object.fromEntries(Object.entries(state.nodeProgress).map(([key, value]) => [key, { ...value }])),
        analyticsLog: state.analyticsLog.map((event) => ({ ...event, metadata: { ...event.metadata } }))
    };
}
