// Background script for handling extension processes

// Listen for installation or update
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Set default settings on installation
        chrome.storage.sync.set({
            languageStyle: 'casual',
            autoLove: false
        });
    }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.type) {
        case 'updateStatus':
            // Forward status updates to popup if it's open
            chrome.runtime.sendMessage(request);
            break;
            
        case 'validateApiKey':
            // Handle API key validation
            validateApiKey(request.apiKey)
                .then(isValid => {
                    sendResponse({ isValid });
                })
                .catch(error => {
                    sendResponse({ isValid: false, error: error.message });
                });
            return true; // Keep message channel open for async response
    }
});

// Function to validate API key
async function validateApiKey(apiKey) {
    try {
        // Make a test request to Gemini API
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateText', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: 'Test request'
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error('Invalid API key');
        }

        return true;
    } catch (error) {
        console.error('API key validation error:', error);
        return false;
    }
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    // Only activate on Facebook domains
    if (tab.url.includes('facebook.com')) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
                // Trigger content script to show AI comment buttons
                document.dispatchEvent(new CustomEvent('showAICommentButtons'));
            }
        });
    }
});

// Error handling and logging
function handleError(error) {
    console.error('Extension error:', error);
    // You could implement error reporting to your server here
}

process.on('unhandledRejection', handleError);
process.on('uncaughtException', handleError);
