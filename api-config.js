// API Configuration Page Logic
const ytApi = new YouTubeAPI();

const apiKeyInput = document.getElementById('apiKey');
const saveBtn = document.getElementById('saveBtn');
const testBtn = document.getElementById('testBtn');
const clearBtn = document.getElementById('clearBtn');
const statusDiv = document.getElementById('status');
const quotaUsedSpan = document.getElementById('quotaUsed');
const quotaRemainingSpan = document.getElementById('quotaRemaining');
const quotaFillDiv = document.getElementById('quotaFill');

// Load existing API key and quota on page load
async function loadSettings() {
    const apiKey = await ytApi.getApiKey();
    if (apiKey) {
        apiKeyInput.value = apiKey;
    }

    await updateQuotaDisplay();
}

async function updateQuotaDisplay() {
    const quota = ytApi.getQuotaStatus();
    quotaUsedSpan.textContent = `${quota.used.toLocaleString()} / 10,000 units used`;
    quotaRemainingSpan.textContent = `${quota.remaining.toLocaleString()} remaining`;
    quotaFillDiv.style.width = `${quota.percentage}%`;
}

function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';

    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}

// Save API key
saveBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();

    if (!key) {
        showStatus('Please enter an API key', 'error');
        return;
    }

    try {
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        await ytApi.setApiKey(key);
        showStatus('✅ API key saved successfully!', 'success');

        saveBtn.textContent = '💾 Save Key';
        saveBtn.disabled = false;
    } catch (error) {
        showStatus(`Error saving key: ${error.message}`, 'error');
        saveBtn.textContent = '💾 Save Key';
        saveBtn.disabled = false;
    }
});

// Test API key
testBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();

    if (!key) {
        showStatus('Please enter an API key to test', 'error');
        return;
    }

    try {
        testBtn.textContent = 'Testing...';
        testBtn.disabled = true;

        const isValid = await ytApi.validateApiKey(key);

        if (isValid) {
            showStatus('✅ API key is valid!', 'success');
        } else {
            showStatus('❌ API key is invalid or restricted', 'error');
        }

        testBtn.textContent = '🧪 Test Key';
        testBtn.disabled = false;
    } catch (error) {
        showStatus(`Error testing key: ${error.message}`, 'error');
        testBtn.textContent = '🧪 Test Key';
        testBtn.disabled = false;
    }
});

// Clear API key
clearBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear the API key?')) {
        try {
            await ytApi.setApiKey('');
            apiKeyInput.value = '';
            showStatus('API key cleared', 'warning');
        } catch (error) {
            showStatus(`Error clearing key: ${error.message}`, 'error');
        }
    }
});

// Initialize
loadSettings();
