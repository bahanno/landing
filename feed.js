import { app } from './firebase-config.js';
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, orderBy, initializeFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const auth = getAuth(app);
const db = initializeFirestore(app, { experimentalForceLongPolling: true });

const feedContainer = document.getElementById('feed-container');
const userEmailSpan = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');

onAuthStateChanged(auth, (user) => {
    if (user) {
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
            let dateStr = "Just now";
            if(post.createdAt) dateStr = new Date(post.createdAt.toMillis()).toLocaleDateString();

            const postElement = document.createElement('div');
            postElement.className = 'post-card';
            postElement.innerHTML = `
                <div class="post-header">
                    <strong>@${post.authorUsername || post.authorEmail.split('@')[0]}</strong>
                    <span>${dateStr}</span>
                </div>
                ${mediaHtml}
                ${contentHtml}
            `;
            feedContainer.appendChild(postElement);
        });
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

// Bottom Nav Chats Alert
document.getElementById('nav-chats').addEventListener('click', (e) => {
    e.preventDefault();
    alert("Chats feature is coming soon!");
});
