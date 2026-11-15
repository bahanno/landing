import { app } from './firebase-config.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, initializeFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const auth = getAuth(app);
const db = initializeFirestore(app, { experimentalForceLongPolling: true });

// ⚠️ আপনার ImgBB API Key এখানে বসান
const IMGBB_API_KEY = "e022a522bf0d1a4887e182d4aea38c17"; 

let currentUser = null;
let currentPostType = 'video';
let selectedFiles = [];
let maxImages = 3;

onAuthStateChanged(auth, (user) => {
    if (user) currentUser = user;
    else window.location.href = "login.html";
});

const tabs = document.querySelectorAll('.tab-btn');
const maxImgText = document.getElementById('max-img-text');
const imageInput = document.getElementById('image-input');
const previewContainer = document.getElementById('preview-container');
const textarea = document.getElementById('post-content');
const charCount = document.getElementById('char-count');
const postBtn = document.getElementById('post-btn');

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

if(textarea) {
    textarea.addEventListener('input', () => {
        if(charCount) charCount.innerText = `${textarea.value.length}/280`;
    });
}

if(postBtn) {
    postBtn.addEventListener('click', async () => {
        const content = textarea.value.trim();
        if (selectedFiles.length === 0 && !content) return alert("Add images or write a caption!");
        if (IMGBB_API_KEY === "e022a522bf0d1a4887e182d4aea38c17") return alert("Please set your ImgBB API key in create.js!");

        postBtn.innerText = "Posting...";
        postBtn.disabled = true;
        let uploadedUrls = [];

        try {
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

            await addDoc(collection(db, "posts"), {
                content: content,
                authorEmail: currentUser.email,
                userId: currentUser.uid,
                postType: currentPostType,
                images: uploadedUrls,
                createdAt: serverTimestamp()
            });

            // Success! Redirect to feed
            window.location.href = "feed.html";

        } catch (error) {
            alert("Error: " + error.message);
            postBtn.innerText = "Post";
            postBtn.disabled = false;
        }
    });
}

// Bottom Nav Chats Alert
document.getElementById('nav-chats').addEventListener('click', (e) => {
    e.preventDefault();
    alert("Chats feature is coming soon!");
});
