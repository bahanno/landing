// API Key Local Storage থেকে নেওয়া হবে
let API_KEY = localStorage.getItem('BAHANNO_GEMINI_KEY');

// যদি Key না থাকে, তবে ইউজারকে জিজ্ঞেস করবে
if (!API_KEY) {
    API_KEY = prompt("Welcome to BAHANNO AI!\nPlease enter your Google Gemini API Key to start chatting.\n(It will be saved securely in your browser):");
    if (API_KEY) {
        localStorage.setItem('BAHANNO_GEMINI_KEY', API_KEY);
    } else {
        alert("API Key is required to use the AI. Please refresh and try again.");
    }
}

const chatContainer = document.getElementById('chatContainer');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');

// Enter চাপলে মেসেজ সেন্ড হবে
userInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
    if (!API_KEY) {
        alert("Please set your API Key first. Refresh the page to enter it.");
        return;
    }

    const text = userInput.value.trim();
    if (!text) return;

    // 1. Add User Message to UI
    appendMessage('user', text);
    userInput.value = '';
    
    // 2. Show Typing Indicator
    sendBtn.disabled = true;
    const typingId = showTypingIndicator();

    try {
        // 3. Call Gemini API
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `You are BAHANNO AI, a helpful, intelligent assistant for Bangladeshi students and tech enthusiasts. Answer briefly and in the same language the user uses (Bangla or English). User says: ${text}` }]
                }]
            })
        });

        const data = await response.json();
        
        // Remove Typing Indicator
        removeTypingIndicator(typingId);
        sendBtn.disabled = false;

        if (data.candidates && data.candidates[0].content.parts[0].text) {
            const botReply = data.candidates[0].content.parts[0].text;
            appendMessage('bot', botReply);
        } else if (data.error) {
            appendMessage('bot', 'API Error: ' + data.error.message);
        } else {
            appendMessage('bot', 'দুঃখিত, আমি এই মুহূর্তে উত্তর দিতে পারছি না। আবার চেষ্টা করুন।');
        }

    } catch (error) {
        removeTypingIndicator(typingId);
        sendBtn.disabled = false;
        appendMessage('bot', 'নেটওয়ার্ক সমস্যা হচ্ছে বা API Key ভুল। ইন্টারনেট চেক করে আবার চেষ্টা করুন।');
        console.error(error);
    }
}

function appendMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const avatar = sender === 'user' ? 'U' : 'B';
    
    // Format text with line breaks
    const formattedText = text.replace(/\n/g, '<br>');

    messageDiv.innerHTML = `
        <div class="avatar">${avatar}</div>
        <div class="bubble">${formattedText}</div>
    `;
    
    chatContainer.appendChild(messageDiv);
    scrollToBottom();
}

function showTypingIndicator() {
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.className = 'message bot-message';
    div.id = id;
    div.innerHTML = `
        <div class="avatar">B</div>
        <div class="bubble">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    chatContainer.appendChild(div);
    scrollToBottom();
    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}
