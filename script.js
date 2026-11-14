// Basic JS for UI Interactivity

function addPost() {
    const input = document.getElementById('postInput');
    const text = input.value.trim();
    
    if (text === "") return;

    const feed = document.querySelector('.main-feed');
    const newPost = document.createElement('div');
    newPost.className = 'post-card';
    newPost.innerHTML = `
        <div class="post-header">
            <div class="avatar bg-purple"></div>
            <div class="user-info">
                <span class="user-name">Guest User</span>
                <span class="user-handle">@guest · Just now</span>
            </div>
        </div>
        <div class="post-content">
            <p>${text}</p>
        </div>
        <div class="post-actions">
            <button onclick="toggleLike(this)">🤍 0</button>
            <button>💬 0</button>
            <button>🔗 Share</button>
        </div>
    `;

    // Insert after the create post box
    const createBox = document.querySelector('.create-post-box');
    createBox.insertAdjacentElement('afterend', newPost);
    
    // Clear input
    input.value = '';
}

function toggleLike(btn) {
    if (btn.innerText.includes('❤️')) {
        let count = parseInt(btn.innerText.split(' ')[1]);
        btn.innerHTML = `🤍 ${count - 1}`;
        btn.style.color = 'var(--text-muted)';
    } else {
        let count = parseInt(btn.innerText.split(' ')[1]);
        btn.innerHTML = `❤️ ${count + 1}`;
        btn.style.color = 'red';
    }
}
