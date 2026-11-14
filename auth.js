import { app } from './firebase-config.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const auth = getAuth(app);

let isLoginMode = true;
const authForm = document.getElementById('auth-form');
const submitBtn = document.getElementById('submit-btn');
const toggleAuth = document.getElementById('toggle-auth');
const authMessage = document.getElementById('auth-message');
const authTitle = document.querySelector('.auth-title');

toggleAuth.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    authTitle.innerText = isLoginMode ? "Welcome Back" : "Create an Account";
    submitBtn.innerText = isLoginMode ? "Log In" : "Sign Up";
    toggleAuth.innerText = isLoginMode ? "Sign Up" : "Log In";
    authMessage.style.display = 'none';
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    submitBtn.innerText = "Processing...";
    submitBtn.disabled = true;
    authMessage.style.display = 'block';
    authMessage.style.color = "#facc15";
    authMessage.innerText = "Connecting to Firebase...";

    try {
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = "feed.html";
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
            authMessage.style.color = "#4ade80";
            authMessage.innerText = "Account created! Logging you in...";
            setTimeout(() => window.location.href = "feed.html", 1500);
        }
    } catch (error) {
        authMessage.style.color = "#f87171";
        // Firebase এরর মেসেজগুলো সাধারণত ক্লিয়ার থাকে
        authMessage.innerText = error.message.replace("Firebase: ", ""); 
    } finally {
        submitBtn.innerText = isLoginMode ? "Log In" : "Sign Up";
        submitBtn.disabled = false;
    }
});
