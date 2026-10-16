/**
 * Aether-Core: Cloudflare Edge Network Client
 * 
 * Communicates with the low-latency Alumungandr Edge Gateway (/api/world)
 * for map verification, ALU coin registration, and global leaderboards.
 * Automatically falls back to local mathematical execution if offline.
 */

class EdgeWorldClient {
    constructor(baseUrl = '') {
        // Automatically default to current origin if in browser, or Alumungandr production
        if (typeof window !== 'undefined' && window.location && window.location.origin) {
            this.baseUrl = window.location.origin;
        } else {
            this.baseUrl = baseUrl || 'https://alumungandr.com';
        }
    }

    async getSeedData(seed) {
        try {
            const resp = await fetch(`${this.baseUrl}/api/world/${seed}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            if (resp.ok) {
                return await resp.json();
            }
        } catch (e) {
            // Offline fallback
        }
        return null;
    }

    async mintWorldCoin(seed, creatorAddress = '0xALU_PIONEER') {
        try {
            const resp = await fetch(`${this.baseUrl}/api/world/mint`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seed, creator: creatorAddress, timestamp: Date.now() })
            });
            if (resp.ok) {
                return await resp.json();
            }
        } catch (e) {
            // Offline fallback
        }
        return {
            status: 'OFFLINE_LOCAL',
            seed,
            ticker: `$ALU-${(seed >>> 0).toString(16).toUpperCase().padStart(4, '0').slice(-4)}`,
            message: 'World minted locally via native ALU math engine'
        };
    }

    async getLeaderboard() {
        try {
            const resp = await fetch(`${this.baseUrl}/api/world/leaderboard`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            if (resp.ok) {
                return await resp.json();
            }
        } catch (e) {
            // Offline fallback
        }
        return {
            topCrawlers: [
                { rank: 1, name: "Pioneer Vance", depth: "Sub-Core 09", coins: 450 },
                { rank: 2, name: "Old Man Gable", depth: "Sub-Core 05", coins: 9999 },
                { rank: 3, name: "Aegis_Pilot_01", depth: "Surface 01", coins: 120 }
            ]
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EdgeWorldClient };
}
