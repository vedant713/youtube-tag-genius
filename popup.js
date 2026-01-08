document.addEventListener('DOMContentLoaded', () => {
  // Main elements
  const keywordInput = document.getElementById('keywordInput');
  const generateBtn = document.getElementById('generateBtn');
  const tagsContainer = document.getElementById('tagsContainer');
  const actionButtons = document.getElementById('actionButtons');
  const searchBtn = document.getElementById('searchBtn');
  const copyBtn = document.getElementById('copyBtn');
  const tagLegend = document.getElementById('tagLegend');

  // Filter elements
  const langFilter = document.getElementById('langFilter');
  const minLength = document.getElementById('minLength');
  const maxLength = document.getElementById('maxLength');
  const excludeWords = document.getElementById('excludeWords');
  const maxTags = document.getElementById('maxTags');

  // Video analyzer elements
  const videoUrl = document.getElementById('videoUrl');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const analyzerResults = document.getElementById('analyzerResults');

  // Store generated tags for filtering
  let currentTags = [];

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`${tab}-tab`).classList.add('active');
    });
  });

  // Filter controls - update range displays
  minLength.addEventListener('input', () => {
    document.getElementById('minLengthVal').textContent = minLength.value;
    applyFilters();
  });

  maxLength.addEventListener('input', () => {
    document.getElementById('maxLengthVal').textContent = maxLength.value;
    applyFilters();
  });

  maxTags.addEventListener('input', () => {
    document.getElementById('maxTagsVal').textContent = maxTags.value;
    applyFilters();
  });

  // Apply filters when changed
  langFilter.addEventListener('change', applyFilters);
  excludeWords.addEventListener('input', applyFilters);

  // Apply filters function
  function applyFilters() {
    if (currentTags.length === 0) return;

    let filtered = [...currentTags];

    // Language filter - more lenient approach
    const lang = langFilter.value;
    if (lang !== 'all') {
      // Instead of strict filtering, we'll only filter if tags contain non-English
      // and user selected English-only, or vice versa
      if (lang === 'en') {
        // Keep only tags with primarily English/Latin characters
        filtered = filtered.filter(t => {
          const text = typeof t === 'string' ? t : t.text;
          // Allow if at least 80% is English characters
          const englishChars = text.match(/[a-zA-Z0-9\s]/g) || [];
          return englishChars.length / text.length >= 0.8;
        });
      } else if (lang === 'hi') {
        // Keep tags that contain some Devanagari OR are transliterations
        filtered = filtered.filter(t => {
          const text = (typeof t === 'string' ? t : t.text).toLowerCase();
          // Check for Devanagari characters OR common Hindi transliterations
          return /[\u0900-\u097F]/.test(text) ||
            /\b(hindi|urdu|tamil|telugu|kaise|kya|hai)\b/.test(text);
        });
      }
      // For other languages, keep all (no strict filter)
    }

    // Length filter
    const min = parseInt(minLength.value);
    const max = parseInt(maxLength.value);
    filtered = filtered.filter(t => {
      const text = typeof t === 'string' ? t : t.text;
      return text.length >= min && text.length <= max;
    });

    // Exclude words
    const excluded = excludeWords.value.split(',').map(w => w.trim().toLowerCase()).filter(w => w);
    if (excluded.length > 0) {
      filtered = filtered.filter(t => {
        const text = (typeof t === 'string' ? t : t.text).toLowerCase();
        return !excluded.some(word => text.includes(word));
      });
    }

    // Max tags limit
    const maxCount = parseInt(maxTags.value);
    filtered = filtered.slice(0, maxCount);

    displayTags(filtered);
  }

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
        currentTags = response.tags; // Store tags for filtering
        applyFilters(); // Apply current filters
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
      // Get only the tag text, not the analytics badges
      const tagText = chip.querySelector('.tag-text');
      tagsToSearch.push(tagText ? tagText.textContent : chip.textContent);
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
    const tags = Array.from(chipElements).map(chip => {
      // Get only the tag text, not the analytics badges
      const tagText = chip.querySelector('.tag-text');
      return tagText ? tagText.textContent : chip.textContent;
    });
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
        const tags = Array.from(chipsToCopy).map(chip => {
          // Get only the tag text, not the analytics badges
          const tagText = chip.querySelector('.tag-text');
          return tagText ? tagText.textContent : chip.textContent;
        });

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

  // Video Analyzer
  analyzeBtn.addEventListener('click', async () => {
    const url = videoUrl.value.trim();
    if (!url) return;

    // Extract video ID from URL
    const videoId = extractVideoId(url);
    if (!videoId) {
      analyzerResults.innerHTML = '<div class="tags-placeholder" style="color: #ff6b6b">Invalid YouTube URL</div>';
      analyzerResults.classList.remove('hidden');
      return;
    }

    analyzeBtn.textContent = 'Analyzing...';
    analyzeBtn.disabled = true;

    try {
      // Fetch video data
      const videoData = await fetchVideoData(videoId);

      // Display results
      displayVideoAnalysis(videoData);
      analyzerResults.classList.remove('hidden');
    } catch (error) {
      analyzerResults.innerHTML = `<div class="tags-placeholder" style="color: #ff6b6b">Error: ${error.message}</div>`;
      analyzerResults.classList.remove('hidden');
    } finally {
      analyzeBtn.textContent = 'Analyze Video';
      analyzeBtn.disabled = false;
    }
  });

  function extractVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  async function fetchVideoData(videoId) {
    // Use YouTube oEmbed API
    const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oEmbedUrl);

    if (!response.ok) {
      throw new Error('Failed to fetch video data');
    }

    const data = await response.json();

    // Generate mock tags based on title (since we can't get real tags without API key)
    const titleWords = data.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const mockTags = titleWords.slice(0, 10);

    return {
      title: data.title,
      author: data.author_name,
      tags: mockTags,
      thumbnail: data.thumbnail_url
    };
  }

  function displayVideoAnalysis(videoData) {
    // Update video info
    document.getElementById('videoTitle').textContent = videoData.title;
    document.getElementById('videoStats').textContent = `By ${videoData.author}`;

    // Display video tags
    const videoTagsContainer = document.getElementById('videoTags');
    videoTagsContainer.innerHTML = '';
    videoData.tags.forEach(tag => {
      const chip = document.createElement('div');
      chip.className = 'chip short';
      chip.innerHTML = `<span class="tag-text">${tag}</span>`;
      videoTagsContainer.appendChild(chip);
    });

    // Display your generated tags (from currentTags)
    const yourTagsContainer = document.getElementById('yourTags');
    yourTagsContainer.innerHTML = '';
    const userTags = currentTags.map(t => typeof t === 'string' ? t : t.text);
    userTags.slice(0, 10).forEach(tag => {
      const chip = document.createElement('div');
      chip.className = 'chip medium';
      chip.innerHTML = `<span class="tag-text">${tag}</span>`;
      yourTagsContainer.appendChild(chip);
    });

    // Find common tags
    const commonTagsArray = videoData.tags.filter(vTag =>
      userTags.some(uTag => uTag.toLowerCase().includes(vTag) || vTag.includes(uTag.toLowerCase()))
    );

    const commonTagsContainer = document.getElementById('commonTags');
    commonTagsContainer.innerHTML = '';
    if (commonTagsArray.length > 0) {
      commonTagsArray.forEach(tag => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.style.background = 'rgba(76, 175, 80, 0.2)';
        chip.innerHTML = `<span class="tag-text">${tag}</span>`;
        commonTagsContainer.appendChild(chip);
      });
    } else {
      commonTagsContainer.innerHTML = '<div class="tags-placeholder">No common tags found</div>';
    }

    // Generate insights
    const insightsList = document.getElementById('insightsList');
    insightsList.innerHTML = '';

    const insights = [];

    if (commonTagsArray.length > 0) {
      insights.push(`✅ Found ${commonTagsArray.length} common tag(s) - Good alignment!`);
    } else {
      insights.push(`⚠️ No overlapping tags - Consider adding video-related keywords`);
    }

    const avgVideoTagLength = videoData.tags.reduce((sum, t) => sum + t.length, 0) / videoData.tags.length;
    const avgYourTagLength = userTags.slice(0, 10).reduce((sum, t) => sum + t.length, 0) / Math.min(10, userTags.length);

    if (avgYourTagLength > avgVideoTagLength * 1.5) {
      insights.push(`📏 Your tags are longer - Consider shorter, punchier keywords`);
    } else if (avgYourTagLength < avgVideoTagLength * 0.7) {
      insights.push(`📏 Your tags are shorter - Good for broad discovery`);
    }

    insights.push(`🎯 Video uses ${videoData.tags.length} keywords from title`);
    insights.push(`💡 Try searching: "${videoData.tags.slice(0, 3).join(' ')}"`);

    insights.forEach(insight => {
      const li = document.createElement('li');
      li.textContent = insight;
      insightsList.appendChild(li);
    });
  }
});
