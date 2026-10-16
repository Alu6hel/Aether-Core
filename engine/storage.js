/**
 * Aether-Core: Storage & State Persistence Engine
 * 
 * Saves player character progress, unlocked secrets (e.g. The Farmer),
 * discovered seeds, and inventory across sessions.
 */

class GameStorage {
    constructor(storageKey = 'AETHER_CORE_STATE_V1') {
        this.storageKey = storageKey;
        this.memStore = {};
    }

    isAvailable() {
        return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    }

    save(state) {
        const payload = JSON.stringify({
            version: 1,
            timestamp: Date.now(),
            data: state
        });
        if (this.isAvailable()) {
            try {
                window.localStorage.setItem(this.storageKey, payload);
            } catch (e) {
                console.warn("Storage save failed:", e);
            }
        } else {
            this.memStore[this.storageKey] = payload;
        }
    }

    load() {
        let raw = null;
        if (this.isAvailable()) {
            try {
                raw = window.localStorage.getItem(this.storageKey);
            } catch (e) {
                console.warn("Storage load failed:", e);
            }
        } else {
            raw = this.memStore[this.storageKey];
        }

        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw);
            return parsed.data || null;
        } catch (e) {
            return null;
        }
    }

    clear() {
        if (this.isAvailable()) {
            window.localStorage.removeItem(this.storageKey);
        } else {
            delete this.memStore[this.storageKey];
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameStorage };
}
