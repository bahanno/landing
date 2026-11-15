import { app } from './firebase-config.js';
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    getFirestore, collection, onSnapshot, query, orderBy, initializeFirestore, 
    doc, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp, getDocs, increment, getDoc,
    deleteDoc
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

function generateAvatar(name) {
    let initial = 'A';
    if (name && name.trim().length > 0) initial = name.trim().charAt(0).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#121317"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-style="italic" font-size="60" fill="#FFFFFF">${initial}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        if(userEmailSpan) userEmailSpan.innerText = user.email.split('@')[0];
        
        const avatarImg = document.getElementById('nav-profile-avatar');
        if(avatarImg) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            let name = user.email.split('@')[0];
            if (userDoc.exists()) name = userDoc.data().displayName || userDoc.data().username || name;
            avatarImg.src = generateAvatar(name);
        }
        loadPosts();
    } else {
        window.location.href = "login.html";
    }
});

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
            const avatarUrl = generateAvatar(authorName);
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
            
            // Dropdown Menu Logic
            const isAuthor = post.userId === currentUser.uid;
            const dropdownOptions = isAuthor 
                ? `<button class="dropdown-item delete-btn" data-id="${postId}">Delete Post</button>`
                : `<button class="dropdown-item report-btn" data-id="${postId}">Report Post</button>`;

            const postElement = document.createElement('div');
            postElement.className = 'post-card';
            postElement.dataset.id = postId;
            
            postElement.innerHTML = `
                <div class="post-header">
                    <a href="profile.html?uid=${post.userId}"><img src="${avatarUrl}" alt="avatar" class="post-avatar"></a>
                    <div class="post-user-info">
                        <div class="name-row">
                            <a href="profile.html?uid=${post.userId}" style="color:inherit;text-decoration:none;"><strong>@${authorName}</strong></a>
                        </div>
                        <span class="post-time">Posted recently</span>
                    </div>
                    <div class="post-options">
                        <button class="more-options" data-id="${postId}">⋮</button>
                        <div class="dropdown-menu" id="dropdown-${postId}">
                            ${dropdownOptions}
                        </div>
                    </div>
                </div>
                ${contentHtml}
                ${mediaHtml}
                <div class="post-actions-row">
                    <div class="stats-left">
                        <span class="stat-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>${viewsCount}</span>
                        <button class="action-btn like-btn ${likeClass}" data-id="${postId}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                            <span class="like-count">${likes.length}</span>
                        </button>
                        <button class="action-btn comment-btn" data-id="${postId}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        </button>
                    </div>
                </div>
                <div class="comments-section" id="comments-${postId}" style="display: none;">
                    <div class="comments-list" id="comments-list-${postId}"></div>
                    <div class="comment-input-wrapper">
                        <input type="text" id="comment-input-${postId}" placeholder="Write a comment..." class="comment-input">
                        <button class="send-comment-btn" data-id="${postId}">Send</button>
                    </div>
                </div>
            `;
            feedContainer.appendChild(postElement);
            viewObserver.observe(postElement);
        });
        attachEventListeners();
    });
}

// Close all dropdowns when clicking anywhere else
document.addEventListener('click', (e) => {
    if (!e.target.matches('.more-options')) {
        document.querySelectorAll('.dropdown-menu').forEach(menu => menu.style.display = 'none');
    }
});

function attachEventListeners() {
    // Toggle Dropdown
    document.querySelectorAll('.more-options').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const postId = btn.dataset.id;
            const menu = document.getElementById(`dropdown-${postId}`);
            const isVisible = menu.style.display === 'block';
            
            document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
            menu.style.display = isVisible ? 'none' : 'block';
        });
    });

    // Delete Post
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if(confirm("Are you sure you want to delete this post?")) {
                const postId = btn.dataset.id;
                try {
                    await deleteDoc(doc(db, "posts", postId));
                } catch (error) {
                    alert("Error deleting post: " + error.message);
                }
            }
        });
    });

    // Report Post
    document.querySelectorAll('.report-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const postId = btn.dataset.id;
            const reason = prompt("Why are you reporting this post? (e.g., Spam, Harassment, Inappropriate)");
            if(!reason) return;
            
            try {
                await addDoc(collection(db, "reports"), {
                    postId: postId,
                    reportedBy: currentUser.uid,
                    reason: reason,
                    createdAt: serverTimestamp()
                });
                alert("Report submitted successfully. Our team will review it.");
            } catch (error) {
                alert("Error reporting post: " + error.message);
            }
        });
    });

    // Like Button
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const postId = btn.dataset.id; const postRef = doc(db, "posts", postId); const isLiked = btn.classList.contains('liked');
            try { 
                if (isLiked) { await updateDoc(postRef, { likes: arrayRemove(currentUser.uid) }); btn.classList.remove('liked'); } 
                else { await updateDoc(postRef, { likes: arrayUnion(currentUser.uid) }); btn.classList.add('liked'); } 
            } catch (error) { console.error(error); }
        });
    });

    // Comments
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

navChats?.addEventListener('click', (e) => { e.preventDefault(); alert("Chats feature is coming soon!"); });
