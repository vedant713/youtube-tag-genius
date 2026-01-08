// YouTube Data API v3 Service
class YouTubeAPI {
    constructor() {
        this.baseUrl = 'https://www.googleapis.com/youtube/v3';
        this.apiKey = null;
        this.quotaUsed = 0;
        this.quotaLimit = 10000;
        this.cachePrefix = 'yt_cache_';
        this.init();
    }

    async init() {
        // Load API key and quota from storage
        const data = await chrome.storage.sync.get(['ytApiKey']);
        const localData = await chrome.storage.local.get(['quotaUsed', 'quotaResetDate']);

        this.apiKey = data.ytApiKey || null;
        this.quotaUsed = localData.quotaUsed || 0;

        // Reset quota if it's a new day (UTC)
        const today = new Date().toISOString().split('T')[0];
        if (localData.quotaResetDate !== today) {
            this.quotaUsed = 0;
            await chrome.storage.local.set({
                quotaUsed: 0,
                quotaResetDate: today
            });
        }
    }

    async setApiKey(key) {
        this.apiKey = key;
        await chrome.storage.sync.set({ ytApiKey: key });
    }

    async getApiKey() {
        if (!this.apiKey) {
            const data = await chrome.storage.sync.get(['ytApiKey']);
            this.apiKey = data.ytApiKey || null;
        }
        return this.apiKey;
    }

    async validateApiKey(key) {
        try {
            const url = `${this.baseUrl}/search?part=snippet&q=test&maxResults=1&type=video&key=${key}`;
            const response = await fetch(url);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async updateQuota(units) {
        this.quotaUsed += units;
        await chrome.storage.local.set({ quotaUsed: this.quotaUsed });
    }

    hasQuota(units) {
        return (this.quotaUsed + units) <= this.quotaLimit;
    }

    getQuotaStatus() {
        return {
            used: this.quotaUsed,
            limit: this.quotaLimit,
            remaining: this.quotaLimit - this.quotaUsed,
            percentage: (this.quotaUsed / this.quotaLimit) * 100
        };
    }

    async getCached(key) {
        const cacheKey = this.cachePrefix + key;
        const data = await chrome.storage.local.get([cacheKey]);
        if (data[cacheKey]) {
            const cached = data[cacheKey];
            // Check if cache is still valid (6 hours for searches, 24 hours for videos)
            const maxAge = key.startsWith('search_') ? 6 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
            if (Date.now() - cached.timestamp < maxAge) {
                return cached.data;
            }
        }
        return null;
    }

    async setCache(key, data) {
        const cacheKey = this.cachePrefix + key;
        await chrome.storage.local.set({
            [cacheKey]: {
                data: data,
                timestamp: Date.now()
            }
        });
    }

    async searchVideos(query, maxResults = 10) {
        await this.init();
        const apiKey = await this.getApiKey();

        if (!apiKey) {
            throw new Error('API key not configured');
        }

        // Check cache first
        const cacheKey = `search_${query}_${maxResults}`;
        const cached = await this.getCached(cacheKey);
        if (cached) return cached;

        // Check quota (100 units per search)
        if (!this.hasQuota(100)) {
            throw new Error('API quota exceeded for today');
        }

        try {
            const url = `${this.baseUrl}/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&type=video&key=${apiKey}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            await this.updateQuota(100);
            await this.setCache(cacheKey, data);

            return data;
        } catch (error) {
            console.error('YouTube API search error:', error);
            throw error;
        }
    }

    async getVideoDetails(videoId) {
        await this.init();
        const apiKey = await this.getApiKey();

        if (!apiKey) {
            throw new Error('API key not configured');
        }

        // Check cache first
        const cacheKey = `video_${videoId}`;
        const cached = await this.getCached(cacheKey);
        if (cached) return cached;

        // Check quota (1 unit per video request)
        if (!this.hasQuota(1)) {
            throw new Error('API quota exceeded for today');
        }

        try {
            const url = `${this.baseUrl}/videos?part=snippet,statistics&id=${videoId}&key=${apiKey}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            await this.updateQuota(1);

            if (data.items && data.items.length > 0) {
                const video = data.items[0];
                await this.setCache(cacheKey, video);
                return video;
            }

            return null;
        } catch (error) {
            console.error('YouTube API video details error:', error);
            throw error;
        }
    }

    async getChannelInfo(channelId) {
        await this.init();
        const apiKey = await this.getApiKey();

        if (!apiKey) {
            throw new Error('API key not configured');
        }

        // Check cache first
        const cacheKey = `channel_${channelId}`;
        const cached = await this.getCached(cacheKey);
        if (cached) return cached;

        // Check quota (1 unit per channel request)
        if (!this.hasQuota(1)) {
            throw new Error('API quota exceeded for today');
        }

        try {
            const url = `${this.baseUrl}/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            await this.updateQuota(1);

            if (data.items && data.items.length > 0) {
                const channel = data.items[0];
                await this.setCache(cacheKey, channel);
                return channel;
            }

            return null;
        } catch (error) {
            console.error('YouTube API channel info error:', error);
            throw error;
        }
    }

    async analyzeTagCompetition(tag) {
        try {
            const searchResults = await this.searchVideos(tag, 3);

            if (!searchResults.items || searchResults.items.length === 0) {
                return { competition: 'low', volume: 0, trending: false };
            }

            // Get total results count
            const totalResults = searchResults.pageInfo?.totalResults || 0;

            // Determine competition based on total results
            let competition = 'low';
            if (totalResults > 1000000) {
                competition = 'high';
            } else if (totalResults > 100000) {
                competition = 'medium';
            }

            // Get video details for top 3 to calculate volume
            const videoIds = searchResults.items.map(item => item.id.videoId);
            let totalViews = 0;
            let recentCount = 0;

            for (const videoId of videoIds) {
                try {
                    const video = await this.getVideoDetails(videoId);
                    if (video && video.statistics) {
                        totalViews += parseInt(video.statistics.viewCount || 0);

                        // Check if video is recent (last 30 days)
                        const publishedAt = new Date(video.snippet.publishedAt);
                        const thirtyDaysAgo = new Date();
                        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                        if (publishedAt > thirtyDaysAgo) {
                            recentCount++;
                        }
                    }
                } catch (error) {
                    console.warn('Failed to get video details:', error);
                }
            }

            const avgViews = videoIds.length > 0 ? Math.floor(totalViews / videoIds.length) : 0;
            const trending = recentCount >= 2; // At least 2 of top 3 are recent

            // Volume score (normalized to 0-100)
            let volume = Math.min(100, Math.floor(avgViews / 10000));

            return { competition, volume, trending };
        } catch (error) {
            console.error('Tag analysis error:', error);
            // Return fallback heuristics
            return null;
        }
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = YouTubeAPI;
}
