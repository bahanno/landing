import { app } from './firebase-config.js';
import { 
    getAuth, browserLocalPersistence, setPersistence, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    sendEmailVerification, 
    GoogleAuthProvider, 
    signInWithPopup,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp, initializeFirestore 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

// Firestore কানেকশন স্ট্যাবল করতে Force Long Polling ব্যবহার
const db = initializeFirestore(app, {
    experimentalForceLongPolling: true
});

let isLoginMode = true;
const authForm = document.getElementById('auth-form');
const submitBtn = document.getElementById('submit-btn');
const toggleAuth = document.getElementById('toggle-auth');
const authMessage = document.getElementById('auth-message');
const authTitle = document.querySelector('.auth-title');
const nameGroup = document.getElementById('name-group');
const displayNameInput = document.getElementById('displayName');
const usernameGroup = document.getElementById('username-group');
const usernameInput = document.getElementById('username');
const usernameStatus = document.getElementById('username-status');
const googleBtn = document.getElementById('google-btn');

let isUsernameAvailable = false;

// Force Username to Lowercase
usernameInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
});

// Toggle Login/Signup Mode
toggleAuth.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    
    if (isLoginMode) {
        authTitle.innerText = "Welcome Back";
        submitBtn.innerText = "Log In";
        toggleAuth.innerText = "Sign Up";
        nameGroup.style.display = 'none';
        usernameGroup.style.display = 'none';
    } else {
        authTitle.innerText = "Create an Account";
        submitBtn.innerText = "Sign Up";
        toggleAuth.innerText = "Log In";
        nameGroup.style.display = 'block';
        usernameGroup.style.display = 'block';
    }
    authMessage.style.display = 'none';
});

// Real-time Username Availability Check
usernameInput.addEventListener('input', async (e) => {
    const username = e.target.value.trim();
    if (username.length < 3) {
        usernameStatus.style.display = 'block';
        usernameStatus.style.color = '#facc15'; 
        usernameStatus.innerText = "Min 3 characters required.";
        isUsernameAvailable = false;
        return;
    }

    usernameStatus.style.display = 'block';
    usernameStatus.style.color = 'var(--text-muted)';
    usernameStatus.innerText = "Checking...";

    try {
        const q = query(collection(db, "users"), where("username", "==", username));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            usernameStatus.style.color = '#4ade80'; 
            usernameStatus.innerText = "Username is available!";
            isUsernameAvailable = true;
        } else {
            usernameStatus.style.color = '#f87171'; 
            usernameStatus.innerText = "Username is already taken.";
            isUsernameAvailable = false;
        }
    } catch (error) {
        console.error("Username check error:", error);
        usernameStatus.style.color = '#f87171';
        usernameStatus.innerText = "Error checking username. Check internet.";
    }
});

// Email Auth Form Submit
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (isLoginMode) {
        submitBtn.innerText = "Processing...";
        submitBtn.disabled = true;
        try {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = "feed.html";
        } catch (error) {
            authMessage.style.display = 'block';
            authMessage.style.color = "#f87171";
            authMessage.innerText = error.message.replace("Firebase: ", "");
        } finally {
            submitBtn.innerText = "Log In";
            submitBtn.disabled = false;
        }
        return;
    }

    // Sign Up Logic
    const displayName = displayNameInput.value.trim();
    const username = usernameInput.value.trim();

    if (!displayName) {
        authMessage.style.display = 'block';
        authMessage.style.color = "#f87171";
        authMessage.innerText = "Please enter your Full Name.";
        return;
    }

    if (!isUsernameAvailable) {
        authMessage.style.display = 'block';
        authMessage.style.color = "#f87171";
        authMessage.innerText = "Please choose a valid, available username.";
        return;
    }

    submitBtn.innerText = "Processing...";
    submitBtn.disabled = true;
    authMessage.style.display = 'block';
    authMessage.style.color = "#facc15";
    authMessage.innerText = "Creating account...";

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update Auth Profile
        await updateProfile(user, { displayName: displayName });

        // Save to Firestore
        await setDoc(doc(db, "users", user.uid), {
            email: email,
            displayName: displayName,
            username: username,
            createdAt: serverTimestamp()
        });

        await sendEmailVerification(user);

        authMessage.style.color = "#4ade80";
        authMessage.innerText = "Verification email sent! Please check inbox.";
        setTimeout(() => toggleAuth.click(), 4000);
    } catch (error) {
        authMessage.style.color = "#f87171";
        authMessage.innerText = error.message.replace("Firebase: ", "");
    } finally {
        submitBtn.innerText = "Sign Up";
        submitBtn.disabled = false;
    }
});

// Google Sign-In Logic
googleBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    googleBtn.innerHTML = "Connecting...";
    googleBtn.disabled = true;

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            let defaultUsername = user.email.split('@')[0].toLowerCase() + Math.floor(Math.random() * 1000);
            
            await setDoc(userDocRef, {
                email: user.email,
                displayName: user.displayName || "Bahanno User",
                username: defaultUsername,
                createdAt: serverTimestamp()
            });
        }
        window.location.href = "feed.html";
    } catch (error) {
        authMessage.style.display = 'block';
        authMessage.style.color = "#f87171";
        authMessage.innerText = error.message;
        googleBtn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" height="20" style="margin-right:10px;"> Continue with Google';
        googleBtn.disabled = false;
    }
});
