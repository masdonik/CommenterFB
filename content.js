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
            buttonContainer.innerHTML = `
                <i class="fas fa-robot"></i>
                <span>AI Comment</span>
            `;
            
            // Add button next to comment input
            input.parentElement.appendChild(buttonContainer);
            input.dataset.aiButtonAdded = 'true';
            
            // Add click event listener
            buttonContainer.addEventListener('click', () => generateAIComment(input));
        }
    });
}

// Function to generate AI comment using Gemini API
console.log('AI Comment button clicked'); // Debug log
async function generateAIComment(inputElement) {
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
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateText', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        })
    });

    if (!response.ok) {
        throw new Error('Failed to generate comment. Please check your API key.');
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// Function to set up auto-love feature
function setupAutoLove() {
    setInterval(() => {
        const likeButtons = document.querySelectorAll('[aria-label="Like"]:not([data-auto-loved="true"])');
        likeButtons.forEach(button => {
            button.click();
            button.dataset.autoLoved = 'true';
        });
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
