import { app } from './firebase-config.js';
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    getFirestore, collection, onSnapshot, query, orderBy, initializeFirestore, 
    doc, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp, getDocs, increment, getDoc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const auth = getAuth(app);
const db = initializeFirestore(app, { experimentalForceLongPolling: true });
const IMGBB_API_KEY = "e022a522bf0d1a4887e182d4aea38c17"; 

let currentUser = null;
let selectedFiles = [];
const viewedPosts = new Set(); 

const feedContainer = document.getElementById('feed-container');
const userEmailSpan = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const navCreate = document.getElementById('nav-create');
const navChats = document.getElementById('nav-chats');
const modal = document.getElementById('create-modal');
const closeModal = document.getElementById('close-modal');
const dropZone = document.getElementById('drop-zone');
const imageInput = document.getElementById('image-input');
const previewContainer = document.getElementById('preview-container');
const postBtn = document.getElementById('post-btn');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        if(userEmailSpan) userEmailSpan.innerText = user.email.split('@')[0];
        
        // Load Nav Avatar
        const avatarImg = document.getElementById('nav-profile-avatar');
        if(avatarImg) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            let name = user.email.split('@')[0];
            if (userDoc.exists()) {
                const data = userDoc.data();
                name = data.displayName || data.username || name;
            }
            avatarImg.src = `https://ui-avatars.com/api/?name=${name}&background=6366f1&color=fff`;
        }

        loadPosts();
    } else {
        window.location.href = "login.html";
    }
});

// ... [বাকি ফাংশনগুলো আগের মতোই থাকবে, আমি শুধু পুরো ফাইলটা একসাথে দিচ্ছি] ...

if(logoutBtn) {
    logoutBtn.addEventListener('click', () => { signOut(auth).then(() => window.location.href = "index.html"); });
}
const viewObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const postId = entry.target.dataset.id;
        if (entry.isIntersecting) {
            entry.target.viewTimer = setTimeout(async () => {
                if (!viewedPosts.has(postId)) {
                    viewedPosts.add(postId);
                    await updateDoc(doc(db, "posts", postId), { views: increment(1) }).catch(e=>console.log(e));
                }
            }, 5000);
        } else {
            if (entry.target.viewTimer) clearTimeout(entry.target.viewTimer);
        }
    });
}, { threshold: 0.5 });

function formatContent(text) { return text ? text.replace(/(#\w+)/g, '<span class="hashtag">$1</span>') : ''; }

function loadPosts() {
    if(!feedContainer) return;
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        feedContainer.innerHTML = '';
        if (snapshot.empty) { feedContainer.innerHTML = '<div class="empty-text">No posts yet. Be the first!</div>'; return; }
        snapshot.forEach((docSnap) => {
            const post = docSnap.data();
            const postId = docSnap.id;
            let mediaHtml = '';
            const urls = post.images || [];
            const authorName = post.authorUsername || post.authorEmail.split('@')[0];
            const avatarUrl = `https://ui-avatars.com/api/?name=${authorName}&background=6366f1&color=fff`;
            const viewsCount = post.views || 0;
            if (urls.length > 0) {
                if (post.postType === 'video') {
                    const slideId = `slideshow-${postId}`;
                    mediaHtml = `<div class="carousel-container"><div class="slideshow" id="${slideId}">${urls.map((url, i) => `<img src="${url}" class="slide ${i===0?'active':''}">`).join('')}</div><div class="slide-dots">${urls.map((_, i) => `<span class="dot ${i===0?'active':''}"></span>`).join('')}</div></div>`;
                    setTimeout(() => startSlideshow(postId), 100);
                } else {
                    mediaHtml = `<div class="swipe-carousel">${urls.map(url => `<img src="${url}" class="swipe-img">`).join('')}</div>`;
                }
            }
            const contentHtml = post.content ? `<div class="post-content">${formatContent(post.content)}</div>` : '';
            const likes = post.likes || [];
            const likeClass = likes.includes(currentUser.uid) ? 'liked' : '';
            const postElement = document.createElement('div');
            postElement.className = 'post-card';
            postElement.dataset.id = postId;
            postElement.innerHTML = `
                <div class="post-header">
                    <img src="${avatarUrl}" alt="avatar" class="post-avatar">
                    <div class="post-user-info">
                        <div class="name-row"><strong>@${authorName}</strong></div>
                        <span class="post-time">Posted recently</span>
                    </div>
                    <button class="more-options">⋮</button>
                </div>
                ${contentHtml}${mediaHtml}
                <div class="post-actions-row">
                    <div class="stats-left">
                        <span class="stat-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>${viewsCount}</span>
                        <button class="action-btn like-btn ${likeClass}" data-id="${postId}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><span class="like-count">${likes.length}</span></button>
                        <button class="action-btn comment-btn" data-id="${postId}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></button>
                    </div>
                </div>
                <div class="comments-section" id="comments-${postId}" style="display: none;"><div class="comments-list" id="comments-list-${postId}"></div><div class="comment-input-wrapper"><input type="text" id="comment-input-${postId}" placeholder="Write a comment..." class="comment-input"><button class="send-comment-btn" data-id="${postId}">Send</button></div></div>
            `;
            feedContainer.appendChild(postElement);
            viewObserver.observe(postElement);
        });
        attachEventListeners();
    });
}

navCreate.addEventListener('click', (e) => { e.preventDefault(); modal.classList.add('active'); });
closeModal.addEventListener('click', () => modal.classList.remove('active'));
modal.addEventListener('click', (e) => { if(e.target === modal) modal.classList.remove('active'); });
dropZone.addEventListener('click', () => imageInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = "var(--accent)"; });
dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.style.borderColor = "#2C2D35"; });
dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.style.borderColor = "#2C2D35"; if(e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); });
imageInput.addEventListener('change', (e) => { if(e.target.files.length) handleFiles(e.target.files); });

function handleFiles(files) {
    const max = document.getElementById('post-type').value === 'video' ? 3 : 5;
    if (files.length > max) return alert(`Max ${max} images allowed.`);
    selectedFiles = Array.from(files);
    previewContainer.innerHTML = ''; previewContainer.style.display = 'flex';
    selectedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => { const img = document.createElement('img'); img.src = e.target.result; img.className = 'preview-thumb'; previewContainer.appendChild(img); };
        reader.readAsDataURL(file);
    });
}

postBtn.addEventListener('click', async () => {
    const content = document.getElementById('post-content').value.trim();
    const postType = document.getElementById('post-type').value;
    if (selectedFiles.length === 0 && !content) return alert("Add images or write a caption!");
    postBtn.innerText = "Publishing..."; postBtn.disabled = true; let uploadedUrls = [];
    try {
        for (let file of selectedFiles) {
            const formData = new FormData(); formData.append('image', file);
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
            const data = await res.json(); if (data.success) uploadedUrls.push(data.data.url);
        }
        await addDoc(collection(db, "posts"), { content, authorEmail: currentUser.email, userId: currentUser.uid, postType, images: uploadedUrls, views: 0, createdAt: serverTimestamp() });
        document.getElementById('post-content').value = ''; selectedFiles = []; previewContainer.innerHTML = ''; previewContainer.style.display = 'none'; modal.classList.remove('active');
    } catch (error) { alert("Error posting: " + error.message); } finally { postBtn.innerText = "Generate post"; postBtn.disabled = false; }
});

function attachEventListeners() {
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const postId = btn.dataset.id; const postRef = doc(db, "posts", postId); const isLiked = btn.classList.contains('liked');
            try { if (isLiked) { await updateDoc(postRef, { likes: arrayRemove(currentUser.uid) }); btn.classList.remove('liked'); } else { await updateDoc(postRef, { likes: arrayUnion(currentUser.uid) }); btn.classList.add('liked'); } } catch (error) { console.error(error); }
        });
    });
    document.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const postId = btn.dataset.id; const commentSection = document.getElementById(`comments-${postId}`);
            if (commentSection.style.display === 'none') { commentSection.style.display = 'block'; loadComments(postId); } else { commentSection.style.display = 'none'; }
        });
    });
    document.querySelectorAll('.send-comment-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const postId = btn.dataset.id; const input = document.getElementById(`comment-input-${postId}`); const text = input.value.trim(); if (!text) return;
            try { await addDoc(collection(db, "posts", postId, "comments"), { text, userId: currentUser.uid, authorEmail: currentUser.email, createdAt: serverTimestamp() }); input.value = ''; loadComments(postId); } catch (error) { alert(error.message); }
        });
    });
}

async function loadComments(postId) {
    const list = document.getElementById(`comments-list-${postId}`); if(!list) return; list.innerHTML = 'Loading...';
    const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q); list.innerHTML = '';
    snapshot.forEach(doc => { const c = doc.data(); const div = document.createElement('div'); div.className = 'comment-item'; div.innerHTML = `<strong>@${c.authorEmail.split('@')[0]}</strong> ${c.text}`; list.appendChild(div); });
}

function startSlideshow(postId) {
    const container = document.getElementById(`slideshow-${postId}`); if (!container) return;
    const slides = container.querySelectorAll('.slide'); const dots = container.parentElement.querySelectorAll('.dot'); if (slides.length <= 1) return;
    let currentIndex = 0;
    setInterval(() => { slides[currentIndex].classList.remove('active'); dots[currentIndex].classList.remove('active'); currentIndex = (currentIndex + 1) % slides.length; slides[currentIndex].classList.add('active'); dots[currentIndex].classList.add('active'); }, 3000);
}

navChats.addEventListener('click', (e) => { e.preventDefault(); alert("Chats feature is coming soon!"); });
