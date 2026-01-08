// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fillSearch') {
        const searchInput = document.querySelector('input#search');
        const searchForm = document.querySelector('form#search-form');

        if (searchInput) {
            // Set value
            searchInput.value = request.query;
            searchInput.focus();

            // Trigger input event for React/Angular frameworks to pick up change
            const event = new Event('input', { bubbles: true });
            searchInput.dispatchEvent(event);

            // Trigger change event
            const changeEvent = new Event('change', { bubbles: true });
            searchInput.dispatchEvent(changeEvent);

            // Submit search after a short delay
            setTimeout(() => {
                const searchLegacyBtn = document.querySelector('button#search-icon-legacy');
                if (searchLegacyBtn) {
                    searchLegacyBtn.click();
                } else {
                    if (searchForm) searchForm.submit();
                }
            }, 100);

        }
    }
});

// Add quick-access icon to YouTube search bar
function addQuickAccessIcon() {
    // Check if already added
    if (document.getElementById('yt-tag-gen-icon')) return;

    const searchContainer = document.querySelector('form#search-form');
    if (!searchContainer) {
        // Retry after a delay if search bar not found yet
        setTimeout(addQuickAccessIcon, 1000);
        return;
    }

    // Create icon button
    const iconButton = document.createElement('button');
    iconButton.id = 'yt-tag-gen-icon';
    iconButton.type = 'button';
    iconButton.title = 'Generate YouTube Tags';
    iconButton.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
      <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>
  `;

    // Style the button
    Object.assign(iconButton.style, {
        position: 'absolute',
        right: '50px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        transition: 'background 0.2s ease',
        zIndex: '100',
        color: '#aaa'
    });

    // Hover effect
    iconButton.addEventListener('mouseenter', () => {
        iconButton.style.background = 'rgba(255, 255, 255, 0.1)';
        iconButton.style.color = '#fff';
    });

    iconButton.addEventListener('mouseleave', () => {
        iconButton.style.background = 'transparent';
        iconButton.style.color = '#aaa';
    });

    // Click handler - opens extension popup (via message to background)
    iconButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Get current search value
        const searchInput = document.querySelector('input#search');
        const currentQuery = searchInput ? searchInput.value.trim() : '';

        // Open the extension popup by clicking the extension icon programmatically
        // Note: We can't directly open the popup, but we can trigger browser action
        // Instead, let's show a tooltip or trigger the extension action
        chrome.runtime.sendMessage({
            action: 'openPopup',
            currentQuery: currentQuery
        });

        // Visual feedback
        iconButton.style.color = '#ff0000';
        setTimeout(() => {
            iconButton.style.color = '#aaa';
        }, 200);
    });

    // Insert the button into the search container
    const searchBoxContainer = searchContainer.querySelector('#search');
    if (searchBoxContainer && searchBoxContainer.parentElement) {
        searchBoxContainer.parentElement.style.position = 'relative';
        searchBoxContainer.parentElement.appendChild(iconButton);
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addQuickAccessIcon);
} else {
    addQuickAccessIcon();
}

// Re-check when navigating (YouTube is a SPA)
const observer = new MutationObserver(() => {
    if (!document.getElementById('yt-tag-gen-icon')) {
        addQuickAccessIcon();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
