// Popup functionality
document.addEventListener('DOMContentLoaded', function() {
    // Load saved settings
    chrome.storage.sync.get(['apiKey', 'languageStyle', 'autoLove'], function(data) {
        if (data.apiKey) {
            document.getElementById('apiKey').value = data.apiKey;
        }
        if (data.languageStyle) {
            document.getElementById('languageStyle').value = data.languageStyle;
        }
        if (data.autoLove !== undefined) {
            document.getElementById('autoLove').checked = data.autoLove;
        }
    });

    // Save settings button click handler
    document.getElementById('saveSettings').addEventListener('click', function() {
        const apiKey = document.getElementById('apiKey').value;
        const languageStyle = document.getElementById('languageStyle').value;
        const autoLove = document.getElementById('autoLove').checked;
        const status = document.getElementById('status');

        // Validate API key
        if (!apiKey) {
            status.textContent = 'Please enter your Gemini API key';
            status.className = 'text-sm text-red-600';
            return;
        }

        // Save settings to Chrome storage
        chrome.storage.sync.set({
            apiKey: apiKey,
            languageStyle: languageStyle,
            autoLove: autoLove
        }, function() {
            status.textContent = 'Settings saved successfully!';
            status.className = 'text-sm text-green-600';
            
            // Reset status message after 2 seconds
            setTimeout(() => {
                status.textContent = 'Ready to use';
                status.className = 'text-sm text-gray-600';
            }, 2000);
        });
    });

    // Settings button hover effect
    const settingsBtn = document.getElementById('settingsBtn');
    settingsBtn.addEventListener('mouseover', function() {
        this.querySelector('i').classList.add('fa-spin');
    });
    settingsBtn.addEventListener('mouseout', function() {
        this.querySelector('i').classList.remove('fa-spin');
    });

    // API Key visibility toggle
    let apiKeyInput = document.getElementById('apiKey');
    apiKeyInput.addEventListener('dblclick', function() {
        this.type = this.type === 'password' ? 'text' : 'password';
    });

    // Add tooltip for API key input
    apiKeyInput.title = 'Double click to show/hide API key';
});

// Function to validate Gemini API key format
function validateApiKey(apiKey) {
    // Add your API key validation logic here
    return apiKey.length > 0;
}

// Function to show notification
function showNotification(message, type = 'info') {
    const status = document.getElementById('status');
    status.textContent = message;
    
    switch(type) {
        case 'success':
            status.className = 'text-sm text-green-600';
            break;
        case 'error':
            status.className = 'text-sm text-red-600';
            break;
        case 'warning':
            status.className = 'text-sm text-yellow-600';
            break;
        default:
            status.className = 'text-sm text-gray-600';
    }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'updateStatus') {
        showNotification(request.message, request.status);
    }
});
