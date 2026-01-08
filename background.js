console.log('Background service worker loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request);

    if (request.action === 'fetchTags') {
        console.log('Fetching tags for query:', request.query);
        fetchTags(request.query)
            .then(tags => {
                console.log('Tags fetched successfully:', tags);
                sendResponse({ tags: tags });
            })
            .catch(error => {
                console.error('Error fetching tags:', error);
                sendResponse({ error: error.message });
            });
        return true; // Will respond asynchronously
    } else if (request.action === 'openPopup') {
        // Store the current query for popup to use
        if (request.currentQuery) {
            chrome.storage.local.set({ lastKeyword: request.currentQuery });
        }
        // Note: We can't programmatically open the popup, but we've stored the query
        // User will need to click the extension icon
        console.log('Stored query for popup:', request.currentQuery);
    }
});

async function fetchTags(query) {
    try {
        console.log('Making enhanced fetch request...');

        // Simplified strategy: Focus on core relevant variations only
        const variations = [
            query,                          // Original query
            `${query} tutorial`            // Tutorial variant (most relevant for learning content)
        ];

        const allSuggestions = new Set();

        // Fetch suggestions for each variation
        for (const variant of variations) {
            try {
                const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(variant)}`;
                const response = await fetch(url);

                if (response.ok) {
                    const data = await response.json();
                    if (data && data[1]) {
                        data[1].forEach(suggestion => allSuggestions.add(suggestion));
                    }
                }
            } catch (error) {
                console.warn(`Failed to fetch for variant: ${variant}`, error);
            }
        }

        // Convert to array and process
        let tags = Array.from(allSuggestions);
        console.log('Raw suggestions:', tags);

        // Extract keywords from the query for relevance checking
        const queryKeywords = query.toLowerCase().split(/\s+/);

        // Filter and improve tags with stricter relevance
        tags = tags
            // Remove overly long suggestions (usually too specific)
            .filter(tag => tag.length < 50)
            // RELEVANCE CHECK: Tag must contain at least one keyword from original query
            .filter(tag => {
                const tagLower = tag.toLowerCase();
                return queryKeywords.some(keyword => tagLower.includes(keyword));
            })
            // Remove "how to" suggestions that user doesn't want
            .filter(tag => !tag.toLowerCase().startsWith('how to '))
            // Remove exact duplicates (case-insensitive)
            .filter((tag, index, self) =>
                index === self.findIndex(t => t.toLowerCase() === tag.toLowerCase())
            )
            // Extract shorter keyword phrases (split on common separators)
            .flatMap(tag => {
                const parts = tag.split(/\s+(?:vs|and|or|\||,)\s+/i);
                return parts.length > 1 ? [tag, ...parts] : [tag];
            })
            // Remove duplicates again after extraction
            .filter((tag, index, self) =>
                index === self.findIndex(t => t.toLowerCase() === tag.toLowerCase())
            )
            // Another relevance pass after extraction
            .filter(tag => {
                const tagLower = tag.toLowerCase();
                return queryKeywords.some(keyword => tagLower.includes(keyword));
            })
            // Sort by relevance: shorter terms first (more general), then alphabetically
            .sort((a, b) => {
                const lenDiff = a.length - b.length;
                return lenDiff !== 0 ? lenDiff : a.localeCompare(b);
            })
            // Limit to top 20 most relevant tags
            .slice(0, 20);

        console.log('Processed tags:', tags);

        if (!tags || tags.length === 0) {
            throw new Error('No tags generated');
        }

        return tags;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}
