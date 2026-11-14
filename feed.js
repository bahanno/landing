// Check if user is logged in
async function checkUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = "login.html";
    } else {
        document.getElementById('user-email').innerText = user.email.split('@')[0];
    }
}
checkUser();

// Logout functionality
document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
});

// Character counter
const textarea = document.getElementById('post-content');
const charCount = document.getElementById('char-count');
textarea.addEventListener('input', () => {
    charCount.innerText = `${textarea.value.length}/280`;
});

// Fetch and render posts
async function loadPosts() {
    const feedContainer = document.getElementById('feed-container');
    feedContainer.innerHTML = '<div class="loading-text">Loading posts...</div>';

    const { data: posts, error } = await supabaseClient
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        feedContainer.innerHTML = `<div class="error-text">Error loading posts: ${error.message}</div>`;
        return;
    }

    if (posts.length === 0) {
        feedContainer.innerHTML = '<div class="empty-text">No posts yet. Be the first to post!</div>';
        return;
    }

    feedContainer.innerHTML = '';
    posts.forEach(post => {
        const date = new Date(post.created_at).toLocaleDateString();
        // Using a short version of user_id as a placeholder for name
        const authorName = post.user_id.substring(0, 6); 
        
        const postElement = document.createElement('div');
        postElement.className = 'post-card';
        postElement.innerHTML = `
            <div class="post-header">
                <strong>User_${authorName}</strong>
                <span>${date}</span>
            </div>
            <div class="post-content">${post.content}</div>
        `;
        feedContainer.appendChild(postElement);
    });
}
loadPosts();

// Create new post
document.getElementById('post-btn').addEventListener('click', async () => {
    const content = textarea.value.trim();
    if (!content) return alert("Write something first!");

    const { data: { user } } = await supabaseClient.auth.getUser();
    
    const btn = document.getElementById('post-btn');
    btn.innerText = "Posting...";
    btn.disabled = true;

    const { error } = await supabaseClient
        .from('posts')
        .insert([{ content: content, user_id: user.id }]);

    if (error) {
        alert("Error posting: " + error.message);
    } else {
        textarea.value = '';
        charCount.innerText = '0/280';
        loadPosts(); // Reload feed
    }

    btn.innerText = "Post";
    btn.disabled = false;
});
