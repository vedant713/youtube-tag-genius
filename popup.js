document.addEventListener('DOMContentLoaded', () => {
  const keywordInput = document.getElementById('keywordInput');
  const generateBtn = document.getElementById('generateBtn');
  const tagsContainer = document.getElementById('tagsContainer');
  const actionButtons = document.getElementById('actionButtons');
  const searchBtn = document.getElementById('searchBtn');
  const copyBtn = document.getElementById('copyBtn');
  const tagLegend = document.getElementById('tagLegend');

  // Load last keyword
  chrome.storage.local.get(['lastKeyword'], (result) => {
    if (result.lastKeyword) {
      keywordInput.value = result.lastKeyword;
    }
  });

  generateBtn.addEventListener('click', async () => {
    const keyword = keywordInput.value.trim();
    if (!keyword) return;

    // Save keyword
    chrome.storage.local.set({ lastKeyword: keyword });

    tagsContainer.innerHTML = '<div class="tags-placeholder">Generating...</div>';

    console.log('Sending message to background script...');
    chrome.runtime.sendMessage({ action: 'fetchTags', query: keyword }, (response) => {
      console.log('Received response:', response);
      console.log('Last error:', chrome.runtime.lastError);

      if (chrome.runtime.lastError) {
        const errorMsg = `Error: ${chrome.runtime.lastError.message}`;
        console.error(errorMsg);
        tagsContainer.innerHTML = `<div class="tags-placeholder" style="color: #ff6b6b">${errorMsg}</div>`;
        return;
      }

      if (response && response.error) {
        const errorMsg = `Error: ${response.error}`;
        console.error(errorMsg);
        tagsContainer.innerHTML = `<div class="tags-placeholder" style="color: #ff6b6b">${errorMsg}</div>`;
      } else if (response && response.tags) {
        console.log('Displaying tags:', response.tags);
        displayTags(response.tags);
      } else {
        console.error('Unknown error - no response');
        tagsContainer.innerHTML = '<div class="tags-placeholder" style="color: #ff6b6b">Unknown error occurred</div>';
      }
    });
  });

  searchBtn.addEventListener('click', async () => {
    const chipElements = document.querySelectorAll('.chip');
    let tagsToSearch = [];
    chipElements.forEach(chip => {
      tagsToSearch.push(chip.innerText);
    });

    if (tagsToSearch.length === 0) return;

    const searchQuery = tagsToSearch.join(' ');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab && tab.url.includes('youtube.com')) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'fillSearch',
        query: searchQuery
      });
    } else {
      chrome.tabs.create({ url: `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}` });
    }
  });

  copyBtn.addEventListener('click', () => {
    const chipElements = document.querySelectorAll('.chip');
    const tags = Array.from(chipElements).map(chip => chip.innerText);
    if (tags.length === 0) return;

    navigator.clipboard.writeText(tags.join(', ')).then(() => {
      const originalText = copyBtn.innerHTML;
      copyBtn.innerText = 'Copied!';
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
      }, 1500);
    });
  });

  function displayTags(tags) {
    if (!tags || tags.length === 0) {
      tagsContainer.innerHTML = '<div class="tags-placeholder">No tags found</div>';
      actionButtons.classList.add('hidden');
      tagLegend.classList.add('hidden');
      return;
    }

    tagsContainer.innerHTML = '<div class="chips fade-in"></div>';
    const chipsContainer = tagsContainer.querySelector('.chips');

    tags.forEach(tagData => {
      // Handle both old and new format
      const tag = typeof tagData === 'string' ? tagData : tagData.text;
      const analytics = tagData.analytics || null;

      const chip = document.createElement('div');
      chip.className = 'chip';

      // Add visual category based on tag length
      if (tag.length <= 15) {
        chip.classList.add('short');
      } else if (tag.length <= 30) {
        chip.classList.add('medium');
      }

      // Create tag structure with analytics
      const tagText = document.createElement('span');
      tagText.className = 'tag-text';
      tagText.textContent = tag;
      chip.appendChild(tagText);

      // Add analytics badges if available
      if (analytics) {
        const badges = document.createElement('div');
        badges.className = 'tag-analytics';

        // Trending indicator
        if (analytics.trending) {
          const trendBadge = document.createElement('span');
          trendBadge.className = 'badge trending';
          trendBadge.textContent = '🔥';
          trendBadge.title = 'Trending';
          badges.appendChild(trendBadge);
        }

        // Competition indicator
        const compBadge = document.createElement('span');
        compBadge.className = `badge competition ${analytics.competition}`;
        compBadge.textContent = analytics.competition[0].toUpperCase();
        compBadge.title = `Competition: ${analytics.competition}`;
        badges.appendChild(compBadge);

        // Volume indicator (show as bar)
        const volBadge = document.createElement('span');
        volBadge.className = 'badge volume';
        const volumeLevel = analytics.volume > 70 ? 'high' : analytics.volume > 40 ? 'med' : 'low';
        volBadge.className = `badge volume ${volumeLevel}`;
        volBadge.textContent = analytics.volume;
        volBadge.title = `Search Volume: ${analytics.volume}/100`;
        badges.appendChild(volBadge);

        chip.appendChild(badges);
      }

      chip.addEventListener('click', () => {
        chip.classList.toggle('selected');
      });
      chipsContainer.appendChild(chip);
    });

    actionButtons.classList.remove('hidden');
    tagLegend.classList.remove('hidden');
  }


  // Allow enter key
  keywordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      generateBtn.click();
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl+A: Select all tags
    if (e.ctrlKey && e.key === 'a') {
      const chips = document.querySelectorAll('.chip');
      if (chips.length > 0) {
        e.preventDefault();
        chips.forEach(chip => chip.classList.add('selected'));
      }
    }

    // Ctrl+C: Copy selected (or all) tags with visual feedback
    if (e.ctrlKey && e.key === 'c') {
      const selectedChips = document.querySelectorAll('.chip.selected');
      const allChips = document.querySelectorAll('.chip');

      if (allChips.length > 0) {
        e.preventDefault();
        const chipsToCopy = selectedChips.length > 0 ? selectedChips : allChips;
        const tags = Array.from(chipsToCopy).map(chip => chip.textContent);

        navigator.clipboard.writeText(tags.join(', ')).then(() => {
          // Visual feedback
          tagsContainer.style.outline = '2px solid #4caf50';
          setTimeout(() => {
            tagsContainer.style.outline = 'none';
          }, 300);
        });
      }
    }
  });
});
