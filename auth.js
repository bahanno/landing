let isLoginMode = true;
const authForm = document.getElementById('auth-form');
const submitBtn = document.getElementById('submit-btn');
const toggleAuth = document.getElementById('toggle-auth');
const authMessage = document.getElementById('auth-message');
const authTitle = document.querySelector('.auth-title');
const authSubtitle = document.querySelector('.auth-subtitle');

// Toggle between Login and Signup
toggleAuth.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    
    if (isLoginMode) {
        authTitle.innerText = "Welcome Back";
        authSubtitle.innerText = "Log in to continue to Bahanno.";
        submitBtn.innerText = "Log In";
        toggleAuth.innerText = "Sign Up";
        document.querySelector('.auth-toggle').childNodes[0].nodeValue = "Don't have an account? ";
    } else {
        authTitle.innerText = "Create an Account";
        authSubtitle.innerText = "Join the Bahanno community today.";
        submitBtn.innerText = "Sign Up";
        toggleAuth.innerText = "Log In";
        document.querySelector('.auth-toggle').childNodes[0].nodeValue = "Already have an account? ";
    }
    authMessage.style.display = 'none';
});

// Handle Form Submit
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    submitBtn.innerText = "Processing...";
    submitBtn.disabled = true;
    authMessage.style.display = 'block';
    authMessage.style.color = "#facc15"; // Yellow for processing
    authMessage.innerText = "Connecting to server...";

    try {
        if (isLoginMode) {
            // LOGIN
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });
            if (error) throw error;
            
            authMessage.style.color = "#4ade80";
            authMessage.innerText = "Login successful! Redirecting to feed...";
            setTimeout(() => window.location.href = "feed.html", 1500);

        } else {
            // SIGNUP
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
            });
            if (error) throw error;
            
            authMessage.style.color = "#4ade80";
            authMessage.innerText = "Signup successful! Check your email to verify.";
            
            setTimeout(() => {
                toggleAuth.click(); // Switch to login mode
            }, 3000);
        }
    } catch (error) {
        console.error("Full Error Details:", error); // For Devs
        
        authMessage.style.color = "#f87171"; // Red error
        
        // Detailed Error Breakdown
        if (error.message === "Failed to fetch") {
            authMessage.innerText = "Network Error: Browser cannot reach the API. Your ISP is blocking it or DNS is failing.";
        } else if (error.status) {
            authMessage.innerText = `Server Error (${error.status}): ${error.message}`;
        } else {
            authMessage.innerText = `Error: ${error.message}`;
        }
    } finally {
        submitBtn.innerText = isLoginMode ? "Log In" : "Sign Up";
        submitBtn.disabled = false;
    }
});
