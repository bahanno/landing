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

    try {
        if (isLoginMode) {
            // LOGIN
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });
            if (error) throw error;
            authMessage.style.color = "#4ade80";
            authMessage.innerText = "Login successful! Redirecting...";
            setTimeout(() => window.location.href = "index.html", 1500);

        } else {
            // SIGNUP
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
            });
            if (error) throw error;
            authMessage.style.color = "#4ade80";
            authMessage.innerText = "Signup successful! Check your email for verification or log in.";
            toggleAuth.click(); // Switch to login mode
        }
    } catch (error) {
        authMessage.style.color = "#f87171"; // Red error
        authMessage.innerText = error.message;
    } finally {
        submitBtn.innerText = isLoginMode ? "Log In" : "Sign Up";
        submitBtn.disabled = false;
    }
});
