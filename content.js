// Content script for Facebook page interaction
let settings = {};

// Load settings from storage
chrome.storage.sync.get(['apiKey', 'languageStyle', 'autoLove'], function(data) {
    settings = data;
});

// Listen for settings changes
chrome.storage.onChanged.addListener(function(changes, namespace) {
    for (let key in changes) {
        settings[key] = changes[key].newValue;
    }
});

// Main function to initialize the extension
function initializeExtension() {
    // Add AI comment buttons to comment sections
    addAICommentButtons();
    // Set up mutation observer to watch for new comments
    observePageChanges();
    // Set up auto-love feature if enabled
    if (settings.autoLove) {
        setupAutoLove();
    }
}

// Function to add AI comment buttons
function addAICommentButtons() {
    // Find all comment input areas
    const commentInputs = document.querySelectorAll('[contenteditable="true"][role="textbox"]');
    
    commentInputs.forEach(input => {
        if (!input.dataset.aiButtonAdded) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'ai-comment-button';
            buttonContainer.style.cssText = 'cursor: pointer; padding: 5px 10px; margin: 5px; background: #f0f2f5; border-radius: 20px; display: inline-flex; align-items: center; gap: 5px;';
            buttonContainer.innerHTML = `
                <i class="fas fa-robot" style="color: #1877f2;"></i>
                <span style="color: #1877f2;">AI Comment</span>
            `;
            
            // Add button next to comment input
            const inputParent = input.closest('.x1n2onr6') || input.parentElement;
            inputParent.appendChild(buttonContainer);
            input.dataset.aiButtonAdded = 'true';
            
            // Add click event listener with improved error handling
            buttonContainer.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('AI Comment button clicked');
                try {
                    await generateAIComment(input);
                    // Trigger auto-like if enabled
                    if (settings.autoLove) {
                        const likeButton = input.closest('[role="article"]')?.querySelector('[aria-label="Like"]');
                        if (likeButton && !likeButton.dataset.autoLoved) {
                            likeButton.click();
                            likeButton.dataset.autoLoved = 'true';
                        }
                    }
                } catch (error) {
                    console.error('Error in comment generation:', error);
                }
            });
        }
    });
}

// Function to generate AI comment using Gemini API
async function generateAIComment(inputElement) {
    console.log('Starting comment generation...'); // Debug log
    try {
        if (!settings.apiKey) {
            throw new Error('Please set your Gemini API key in the extension settings');
        }

        // Show loading state
        const button = inputElement.parentElement.querySelector('.ai-comment-button');
        const originalContent = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner loading"></i>';
        button.disabled = true;

        // Get the context (parent comment or post content)
        const context = getCommentContext(inputElement);

        // Prepare the prompt based on language style
        const prompt = preparePrompt(context, settings.languageStyle);

        // Call Gemini API
        const response = await callGeminiAPI(prompt);

        // Insert the generated comment
        inputElement.textContent = response;
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));

        // Restore button state
        button.innerHTML = originalContent;
        button.disabled = false;

    } catch (error) {
        console.error('Error generating comment:', error);
        chrome.runtime.sendMessage({
            type: 'updateStatus',
            message: error.message,
            status: 'error'
        });
    }
}

// Function to get comment context
function getCommentContext(inputElement) {
    // Try to find parent comment or post content
    const parentComment = inputElement.closest('[role="article"]');
    if (parentComment) {
        const contentElement = parentComment.querySelector('[data-ad-preview="message"]');
        return contentElement ? contentElement.textContent.trim() : '';
    }
    return '';
}

// Function to prepare prompt based on language style
function preparePrompt(context, style) {
    const stylePrompts = {
        formal: 'Please generate a formal and professional response to this content:',
        casual: 'Create a casual and relaxed response to this:',
        friendly: 'Write a friendly and warm response to this:',
        professional: 'Compose a business-appropriate response to this:',
        humorous: 'Generate a funny and light-hearted response to this:'
    };

    return `${stylePrompts[style] || stylePrompts.casual} "${context}"`;
}

// Function to call Gemini API
async function callGeminiAPI(prompt) {
    console.log('Calling Gemini API with prompt:', prompt);
    console.log('Using API Key:', settings.apiKey ? 'API Key exists' : 'No API Key found');

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${settings.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            })
        });

        console.log('API Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error('API Error response:', errorData);
            throw new Error(`Failed to generate comment. Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response data:', data);

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
            throw new Error('Invalid response format from API');
        }

        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Error in API call:', error);
        throw new Error(`Failed to generate comment: ${error.message}`);
    }
}

// Function to set up auto-love feature
function setupAutoLove() {
    // Clear any existing intervals
    if (window.autoLoveInterval) {
        clearInterval(window.autoLoveInterval);
    }
    
    window.autoLoveInterval = setInterval(() => {
        if (settings.autoLove) {
            console.log('Checking for new like buttons...');
            const likeButtons = document.querySelectorAll('[aria-label="Like"]:not([data-auto-loved="true"])');
            likeButtons.forEach(button => {
                if (button.offsetParent !== null) { // Check if button is visible
                    console.log('Clicking like button');
                    button.click();
                    button.dataset.autoLoved = 'true';
                }
            });
        }
    }, 2000);
}

// Function to observe page changes
function observePageChanges() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                addAICommentButtons();
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializeExtension);

// Re-initialize when URL changes (for single-page-application behavior)
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        initializeExtension();
    }
}).observe(document, { subtree: true, childList: true });
