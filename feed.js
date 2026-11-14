// ⚠️ REPLACE THIS WITH YOUR IMGBB API KEY
const IMGBB_API_KEY = "e022a522bf0d1a4887e182d4aea38c17";

async function checkUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) { window.location.href = "login.html"; } 
    else { document.getElementById('user-email').innerText = user.email.split('@')[0]; }
}
checkUser();

document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
});

// --- UI LOGIC ---
let currentPostType = 'video'; // default
let selectedFiles = [];
let maxImages = 3;

const tabs = document.querySelectorAll('.tab-btn');
const maxImgText = document.getElementById('max-img-text');
const imageInput = document.getElementById('image-input');
const previewContainer = document.getElementById('preview-container');

// Tab Switching
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentPostType = tab.dataset.type;
        maxImages = currentPostType === 'video' ? 3 : 5;
        maxImgText.innerText = maxImages;
        
        // Reset selection when switching tabs
        resetUpload();
    });
});

// Preview Images
imageInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length > maxImages) {
        alert(`You can only select up to ${maxImages} images for this post type.`);
        imageInput.value = '';
        return;
    }
    
    selectedFiles = files;
    previewContainer.innerHTML = '';
    previewContainer.style.display = 'flex';

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'preview-thumb';
            previewContainer.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
});

function resetUpload() {
    selectedFiles = [];
    imageInput.value = '';
    previewContainer.innerHTML = '';
    previewContainer.style.display = 'none';
}

// Char count
const textarea = document.getElementById('post-content');
const charCount = document.getElementById('char-count');
textarea.addEventListener('input', () => {
    charCount.innerText = `${textarea.value.length}/280`;
});


// --- FEED RENDERING ---
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
        const type = post.post_type || 'image'; // fallback for old posts
        const urls = post.image_urls || (post.image_url ? [post.image_url] : []);
        
        let mediaHtml = '';

        if (urls.length > 0) {
            if (type === 'video') {
                // Auto-slideshow logic
                const slideId = `slideshow-${post.id}`;
                mediaHtml = `
                <div class="carousel-container">
                    <div class="slideshow" id="${slideId}">
                        ${urls.map((url, i) => `<img src="${url}" class="slide ${i===0?'active':''}">`).join('')}
                    </div>
                    <div class="slide-dots">
                        ${urls.map((_, i) => `<span class="dot ${i===0?'active':''}"></span>`).join('')}
                    </div>
                </div>`;
                
                // Add JS for this specific slideshow after rendering
                setTimeout(() => startSlideshow(post.id), 100);
            } else {
                // Manual Swipe Carousel (Image post)
                mediaHtml = `
                <div class="swipe-carousel">
                    ${urls.map(url => `<img src="${url}" class="swipe-img">`).join('')}
                </div>
                <div class="swipe-hint">← Swipe to view →</div>`;
            }
        }

        const contentHtml = post.content ? `<div class="post-content">${post.content}</div>` : '';

        const postElement = document.createElement('div');
        postElement.className = 'post-card';
        postElement.innerHTML = `
            <div class="post-header">
                <strong>User_${authorName}</strong>
                <span>${date}</span>
            </div>
            ${mediaHtml}
            ${contentHtml}
        `;
        feedContainer.appendChild(postElement);
    });
}

// Start Auto-slideshow for Video Posts
function startSlideshow(postId) {
    const container = document.getElementById(`slideshow-${postId}`);
    if (!container) return;
    const slides = container.querySelectorAll('.slide');
    const dots = container.parentElement.querySelectorAll('.dot');
    if (slides.length <= 1) return;

    let currentIndex = 0;
    setInterval(() => {
        slides[currentIndex].classList.remove('active');
        dots[currentIndex].classList.remove('active');
        
        currentIndex = (currentIndex + 1) % slides.length;
        
        slides[currentIndex].classList.add('active');
        dots[currentIndex].classList.add('active');
    }, 3000); // 3 seconds
}

loadPosts();

// Create new post
document.getElementById('post-btn').addEventListener('click', async () => {
    const content = textarea.value.trim();
    if (selectedFiles.length === 0 && !content) return alert("Add images or write a caption!");

    const btn = document.getElementById('post-btn');
    btn.innerText = "Posting...";
    btn.disabled = true;

    let uploadedUrls = [];

    try {
        // Upload images to ImgBB
        for (let file of selectedFiles) {
            const formData = new FormData();
            formData.append('image', file);
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) uploadedUrls.push(data.data.url);
        }

        const { data: { user } } = await supabaseClient.auth.getUser();
        
        const { error } = await supabaseClient
            .from('posts')
            .insert([{ 
                content: content, 
                user_id: user.id,
                post_type: currentPostType,
                image_urls: uploadedUrls 
            }]);

        if (error) throw error;

        textarea.value = '';
        charCount.innerText = '0/280';
        resetUpload();
        loadPosts(); 

    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        btn.innerText = "Post";
        btn.disabled = false;
    }
});
