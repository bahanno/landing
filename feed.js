// ⚠️ REPLACE THIS WITH YOUR IMGBB API KEY
const IMGBB_API_KEY = "e022a522bf0d1a4887e182d4aea38c17";

async function checkUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = "login.html";
    } else {
        document.getElementById('user-email').innerText = user.email.split('@')[0];
    }
}
checkUser();

document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
});

// Image Preview Logic
const imageInput = document.getElementById('image-input');
const imagePreview = document.getElementById('image-preview');
const uploadLabel = document.querySelector('.upload-label');
let selectedFile = null;

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            uploadLabel.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
});

// Char count
const textarea = document.getElementById('post-content');
const charCount = document.getElementById('char-count');
textarea.addEventListener('input', () => {
    charCount.innerText = `${textarea.value.length}/280`;
});

// Load Posts
async function loadPosts() {
    const feedContainer = document.getElementById('feed-container');
    feedContainer.innerHTML = '<div class="loading-text">Loading feed...</div>';

    const { data: posts, error } = await supabaseClient
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        feedContainer.innerHTML = `<div class="error-text">Error: ${error.message}</div>`;
        return;
    }

    if (posts.length === 0) {
        feedContainer.innerHTML = '<div class="empty-text">No posts yet. Be the first!</div>';
        return;
    }

    feedContainer.innerHTML = '';
    posts.forEach(post => {
        const date = new Date(post.created_at).toLocaleDateString();
        const authorName = post.user_id.substring(0, 6); 
        
        // Only display if there is an image
        const imageHtml = post.image_url ? `<img src="${post.image_url}" class="post-image" loading="lazy">` : '';
        const contentHtml = post.content ? `<div class="post-content">${post.content}</div>` : '';

        const postElement = document.createElement('div');
        postElement.className = 'post-card';
        postElement.innerHTML = `
            <div class="post-header">
                <strong>User_${authorName}</strong>
                <span>${date}</span>
            </div>
            ${imageHtml}
            ${contentHtml}
        `;
        feedContainer.appendChild(postElement);
    });
}
loadPosts();

// Create Post with Image Upload
document.getElementById('post-btn').addEventListener('click', async () => {
    const content = textarea.value.trim();
    if (!selectedFile && !content) return alert("Add an image or write a caption!");

    const btn = document.getElementById('post-btn');
    btn.innerText = selectedFile ? "Uploading Image..." : "Posting...";
    btn.disabled = true;

    let imageUrl = null;

    try {
        // 1. Upload to ImgBB if an image is selected
        if (selectedFile) {
            const formData = new FormData();
            formData.append('image', selectedFile);
            
            const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });
            
            const imgbbData = await imgbbResponse.json();
            
            if (!imgbbData.success) throw new Error("Image upload failed");
            imageUrl = imgbbData.data.url;
        }

        // 2. Insert into Supabase
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        const { error } = await supabaseClient
            .from('posts')
            .insert([{ 
                content: content, 
                user_id: user.id,
                image_url: imageUrl 
            }]);

        if (error) throw error;

        // Reset form
        textarea.value = '';
        charCount.innerText = '0/280';
        imagePreview.style.display = 'none';
        uploadLabel.style.display = 'flex';
        selectedFile = null;
        imageInput.value = '';
        
        loadPosts(); // Reload feed

    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        btn.innerText = "Post";
        btn.disabled = false;
    }
});
