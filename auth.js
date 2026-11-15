import { app } from './firebase-config.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    sendEmailVerification, 
    GoogleAuthProvider, 
    signInWithPopup 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

let isLoginMode = true;
const authForm = document.getElementById('auth-form');
const submitBtn = document.getElementById('submit-btn');
const toggleAuth = document.getElementById('toggle-auth');
const authMessage = document.getElementById('auth-message');
const authTitle = document.querySelector('.auth-title');
const usernameGroup = document.getElementById('username-group');
const usernameInput = document.getElementById('username');
const usernameStatus = document.getElementById('username-status');
const googleBtn = document.getElementById('google-btn');

let isUsernameAvailable = false;

// Toggle Login/Signup Mode
toggleAuth.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    
    if (isLoginMode) {
        authTitle.innerText = "Welcome Back";
        submitBtn.innerText = "Log In";
        toggleAuth.innerText = "Sign Up";
        usernameGroup.style.display = 'none';
        usernameInput.required = false;
    } else {
        authTitle.innerText = "Create an Account";
        submitBtn.innerText = "Sign Up";
        toggleAuth.innerText = "Log In";
        usernameGroup.style.display = 'block';
        usernameInput.required = true;
    }
    authMessage.style.display = 'none';
});

// Real-time Username Availability Check
usernameInput.addEventListener('input', async (e) => {
    const username = e.target.value.trim().toLowerCase();
    if (username.length < 3) {
        usernameStatus.style.display = 'block';
        usernameStatus.style.color = '#facc15'; // Yellow
        usernameStatus.innerText = "Min 3 characters required.";
        isUsernameAvailable = false;
        return;
    }

    usernameStatus.style.display = 'block';
    usernameStatus.style.color = 'var(--text-muted)';
    usernameStatus.innerText = "Checking...";

    const q = query(collection(db, "users"), where("username", "==", username));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        usernameStatus.style.color = '#4ade80'; // Green
        usernameStatus.innerText = "Username is available!";
        isUsernameAvailable = true;
    } else {
        usernameStatus.style.color = '#f87171'; // Red
        usernameStatus.innerText = "Username is already taken.";
        isUsernameAvailable = false;
    }
});

// Email Auth Form Submit
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const username = usernameInput.value.trim().toLowerCase();

    if (!isLoginMode && !isUsernameAvailable) {
        authMessage.style.display = 'block';
        authMessage.style.color = "#f87171";
        authMessage.innerText = "Please choose a valid, available username.";
        return;
    }

    submitBtn.innerText = "Processing...";
    submitBtn.disabled = true;
    authMessage.style.display = 'block';
    authMessage.style.color = "#facc15";
    authMessage.innerText = "Connecting...";

    try {
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = "feed.html";
        } else {
            // Sign Up Process
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Save Username to Firestore
            await setDoc(doc(db, "users", user.uid), {
                email: email,
                username: username,
                createdAt: serverTimestamp()
            });

            // Send Verification Email
            await sendEmailVerification(user);

            authMessage.style.color = "#4ade80";
            authMessage.innerText = "Account created! Verification email sent. Please check your inbox.";
            
            setTimeout(() => {
                toggleAuth.click(); // Switch to login
            }, 4000);
        }
    } catch (error) {
        authMessage.style.color = "#f87171";
        authMessage.innerText = error.message.replace("Firebase: ", "");
    } finally {
        submitBtn.innerText = isLoginMode ? "Log In" : "Sign Up";
        submitBtn.disabled = false;
    }
});

// Google Sign-In Logic
googleBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    googleBtn.innerText = "Connecting...";
    googleBtn.disabled = true;

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Check if user already exists in Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            // First time Google login: Generate a default username based on email
            let defaultUsername = user.email.split('@')[0].toLowerCase() + Math.floor(Math.random() * 1000);
            
            await setDoc(userDocRef, {
                email: user.email,
                username: defaultUsername,
                createdAt: serverTimestamp()
            });
        }

        window.location.href = "feed.html";
    } catch (error) {
        authMessage.style.display = 'block';
        authMessage.style.color = "#f87171";
        authMessage.innerText = error.message;
        googleBtn.innerText = "Continue with Google";
        googleBtn.disabled = false;
    }
});
