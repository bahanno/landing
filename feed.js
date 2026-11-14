import { app } from './firebase-config.js';
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

// ⚠️ এখানে আপনার ImgBB API Key টা বসান
const IMGBB_API_KEY = "YOUR_IMGBB_API_KEY"; 

let currentUser = null;
let currentPostType = 'video';
let selectedFiles = [];
let maxImages = 3;

// UI Elements
const tabs = document.querySelectorAll('.tab-btn');
const maxImgText = document.getElementById('max-img-text');
const imageInput = document.getElementById('image-input');
const previewContainer = document.getElementById('preview-container');
const textarea = document.getElementById('post-content');
const charCount = document.getElementById('char-count');
const postBtn = document.getElementById('post-btn');
const feedContainer = document.getElementById('feed-container');
const userEmailSpan = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');

// Check Auth State
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        if(userEmailSpan) userEmailSpan.innerText = user.email.split('@')[0];
        loadPosts();
    } else {
        window.location.href = "login.html";
    }
});

// Logout
if(logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => window.location.href = "index.html");
    });
}

// Tab Switching
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentPostType = tab.dataset.type;
        maxImages = currentPostType === 'video' ? 3 : 5;
        if(maxImgText) maxImgText.innerText = maxImages;
        resetUpload();
    });
});

// Image Preview
if(imageInput) {
    imageInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length > maxImages) {
            alert(`Max ${maxImages} images allowed.`);
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
}

function resetUpload() {
    selectedFiles = [];
    if(imageInput) imageInput.value = '';
    if(previewContainer) {
        previewContainer.innerHTML = '';
        previewContainer.style.display = 'none';
    }
}

// Char Count
if(textarea) {
    textarea.addEventListener('input', () => {
        if(charCount) charCount.innerText = `${textarea.value.length}/280`;
    });
}

// Load Posts from Firebase Firestore
function loadPosts() {
    if(!feedContainer) return;
    
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    
    onSnapshot(q, (snapshot) => {
        feedContainer.innerHTML = '';
        
        if (snapshot.empty) {
            feedContainer.innerHTML = '<div class="empty-text">No posts yet. Be the first!</div>';
            return;
        }

        snapshot.forEach((doc) => {
            const post = doc.data();
            let mediaHtml = '';
            const urls = post.images || [];
            
            if (urls.length > 0) {
                if (post.postType === 'video') {
                    const slideId = `slideshow-${doc.id}`;
                    mediaHtml = `
                    <div class="carousel-container">
                        <div class="slideshow" id="${slideId}">
                            ${urls.map((url, i) => `<img src="${url}" class="slide ${i===0?'active':''}">`).join('')}
                        </div>
                        <div class="slide-dots">
                            ${urls.map((_, i) => `<span class="dot ${i===0?'active':''}"></span>`).join('')}
                        </div>
                    </div>`;
                    setTimeout(() => startSlideshow(doc.id), 100);
                } else {
                    mediaHtml = `
                    <div class="swipe-carousel">
                        ${urls.map(url => `<img src="${url}" class="swipe-img">`).join('')}
                    </div>
                    <div class="swipe-hint">← Swipe to view →</div>`;
                }
            }

            const contentHtml = post.content ? `<div class="post-content">${post.content}</div>` : '';
            
            // Date formatting
            let dateStr = "Just now";
            if(post.createdAt) {
                dateStr = new Date(post.createdAt.toMillis()).toLocaleDateString();
            }

            const postElement = document.createElement('div');
            postElement.className = 'post-card';
            postElement.innerHTML = `
                <div class="post-header">
                    <strong>${post.authorEmail.split('@')[0]}</strong>
                    <span>${dateStr}</span>
                </div>
                ${mediaHtml}
                ${contentHtml}
            `;
            feedContainer.appendChild(postElement);
        });
    });
}

// Auto-slideshow Logic
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
    }, 3000);
}

// Create Post
if(postBtn) {
    postBtn.addEventListener('click', async () => {
        const content = textarea.value.trim();
        if (selectedFiles.length === 0 && !content) return alert("Add images or write a caption!");
        if (IMGBB_API_KEY === "YOUR_IMGBB_API_KEY") return alert("Please set your ImgBB API key in feed.js!");

        postBtn.innerText = "Posting...";
        postBtn.disabled = true;
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

            // Save to Firestore
            await addDoc(collection(db, "posts"), {
                content: content,
                authorEmail: currentUser.email,
                userId: currentUser.uid,
                postType: currentPostType,
                images: uploadedUrls,
                createdAt: serverTimestamp()
            });

            textarea.value = '';
            if(charCount) charCount.innerText = '0/280';
            resetUpload(); 

        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            postBtn.innerText = "Post";
            postBtn.disabled = false;
        }
    });
}
