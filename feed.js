import { app } from './firebase-config.js';
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    getFirestore, collection, onSnapshot, query, orderBy, initializeFirestore, 
    doc, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp, getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const auth = getAuth(app);
const db = initializeFirestore(app, { experimentalForceLongPolling: true });

let currentUser = null;
const feedContainer = document.getElementById('feed-container');
const userEmailSpan = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        if(userEmailSpan) userEmailSpan.innerText = user.email.split('@')[0];
        loadPosts();
    } else {
        window.location.href = "login.html";
    }
});

if(logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => window.location.href = "index.html");
    });
}

// Hashtag parser function
function formatContent(text) {
    if (!text) return '';
    return text.replace(/(#\w+)/g, '<span class="hashtag">$1</span>');
}

function loadPosts() {
    if(!feedContainer) return;
    
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    
    onSnapshot(q, (snapshot) => {
        feedContainer.innerHTML = '';
        
        if (snapshot.empty) {
            feedContainer.innerHTML = '<div class="empty-text">No posts yet. Be the first!</div>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const post = docSnap.data();
            const postId = docSnap.id;
            let mediaHtml = '';
            const urls = post.images || [];
            const authorName = post.authorUsername || post.authorEmail.split('@')[0];
            
            // Random avatar generator for now
            const avatarUrl = `https://ui-avatars.com/api/?name=${authorName}&background=6366f1&color=fff`;
            
            // Random views mock (just for UI look)
            const viewsCount = Math.floor(Math.random() * 5000) + 100;

            // Image / Slideshow logic
            if (urls.length > 0) {
                if (post.postType === 'video') {
                    const slideId = `slideshow-${postId}`;
                    mediaHtml = `
                    <div class="carousel-container">
                        <div class="slideshow" id="${slideId}">
                            ${urls.map((url, i) => `<img src="${url}" class="slide ${i===0?'active':''}">`).join('')}
                        </div>
                        <div class="slide-dots">
                            ${urls.map((_, i) => `<span class="dot ${i===0?'active':''}"></span>`).join('')}
                        </div>
                    </div>`;
                    setTimeout(() => startSlideshow(postId), 100);
                } else {
                    mediaHtml = `
                    <div class="swipe-carousel">
                        ${urls.map(url => `<img src="${url}" class="swipe-img">`).join('')}
                    </div>`;
                }
            }

            const contentHtml = post.content ? `<div class="post-content">${formatContent(post.content)}</div>` : '';
            let dateStr = "Just now";
            if(post.createdAt) dateStr = "Posted recently"; // Shortened for premium look

            // Like Logic
            const likes = post.likes || [];
            const isLiked = likes.includes(currentUser.uid);
            const likeClass = isLiked ? 'liked' : '';

            const postElement = document.createElement('div');
            postElement.className = 'post-card';
            postElement.innerHTML = `
                <div class="post-header">
                    <img src="${avatarUrl}" alt="avatar" class="post-avatar">
                    <div class="post-user-info">
                        <div class="name-row">
                            <strong>@${authorName}</strong>
                            <svg class="verified-icon" viewBox="0 0 24 24" fill="#3b82f6"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        </div>
                        <span class="post-time">${dateStr}</span>
                    </div>
                    <button class="more-options">⋮</button>
                </div>
                
                ${contentHtml}
                ${mediaHtml}
                
                <!-- Bottom Stats & Actions -->
                <div class="post-actions-row">
                    <div class="stats-left">
                        <span class="stat-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            ${viewsCount}
                        </span>
                        <button class="action-btn like-btn ${likeClass}" data-id="${postId}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                            <span class="like-count">${likes.length}</span>
                        </button>
                        <button class="action-btn comment-btn" data-id="${postId}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        </button>
                    </div>
                    <button class="action-btn save-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                    </button>
                </div>

                <!-- Comments Section -->
                <div class="comments-section" id="comments-${postId}" style="display: none;">
                    <div class="comments-list" id="comments-list-${postId}"></div>
                    <div class="comment-input-wrapper">
                        <input type="text" id="comment-input-${postId}" placeholder="Write a comment..." class="comment-input">
                        <button class="send-comment-btn" data-id="${postId}">Send</button>
                    </div>
                </div>
            `;
            feedContainer.appendChild(postElement);
        });

        attachEventListeners();
    });
}

function attachEventListeners() {
    // Like Button
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const postId = btn.dataset.id;
            const postRef = doc(db, "posts", postId);
            const isLiked = btn.classList.contains('liked');

            try {
                if (isLiked) {
                    await updateDoc(postRef, { likes: arrayRemove(currentUser.uid) });
                    btn.classList.remove('liked');
                } else {
                    await updateDoc(postRef, { likes: arrayUnion(currentUser.uid) });
                    btn.classList.add('liked');
                }
            } catch (error) {
                console.error("Like error:", error);
            }
        });
    });

    // Toggle Comment Box
    document.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const postId = btn.dataset.id;
            const commentSection = document.getElementById(`comments-${postId}`);
            if (commentSection.style.display === 'none') {
                commentSection.style.display = 'block';
                loadComments(postId);
            } else {
                commentSection.style.display = 'none';
            }
        });
    });

    // Send Comment
    document.querySelectorAll('.send-comment-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const postId = btn.dataset.id;
            const input = document.getElementById(`comment-input-${postId}`);
            const text = input.value.trim();
            if (!text) return;

            try {
                await addDoc(collection(db, "posts", postId, "comments"), {
                    text: text,
                    userId: currentUser.uid,
                    authorEmail: currentUser.email,
                    createdAt: serverTimestamp()
                });
                input.value = '';
                loadComments(postId);
            } catch (error) {
                alert("Error: " + error.message);
            }
        });
    });

    // Save Button dummy interaction
    document.querySelectorAll('.save-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.style.color = btn.style.color === 'rgb(250, 204, 21)' ? '' : '#facc15';
        });
    });
}

async function loadComments(postId) {
    const list = document.getElementById(`comments-list-${postId}`);
    if(!list) return;
    list.innerHTML = '<div style="color:gray;font-size:0.8rem;">Loading...</div>';
    
    const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    
    list.innerHTML = '';
    if(snapshot.empty) {
        list.innerHTML = '<div style="color:gray;font-size:0.8rem;">No comments yet.</div>';
        return;
    }
    
    snapshot.forEach(doc => {
        const c = doc.data();
        const div = document.createElement('div');
        div.className = 'comment-item';
        div.innerHTML = `<strong>@${c.authorEmail.split('@')[0]}</strong> ${c.text}`;
        list.appendChild(div);
    });
}

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

document.getElementById('nav-chats').addEventListener('click', (e) => {
    e.preventDefault();
    alert("Chats feature is coming soon!");
});
