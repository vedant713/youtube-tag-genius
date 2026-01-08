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

    tags.forEach(tag => {
      const chip = document.createElement('div');
      chip.className = 'chip';

      // Add visual category based on tag length
      if (tag.length <= 15) {
        chip.classList.add('short'); // Short, focused keywords
      } else if (tag.length <= 30) {
        chip.classList.add('medium'); // Medium-length phrases
      }

      chip.textContent = tag;
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
});
