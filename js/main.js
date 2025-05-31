document.addEventListener('DOMContentLoaded', () => {
  class AuthModal {
    constructor() {
      this.modal = document.getElementById('login-modal');
      this.loginBtn = document.getElementById('login-btn');
      this.closeBtn = document.getElementById('close-modal');
      this.otpLoginForm = document.getElementById('otp-login-form');
      this.mobileInputSection = document.getElementById('mobile-input-section');
      this.otpInputSection = document.getElementById('otp-input-section');
      this.mobileNumberInput = document.getElementById('mobile-number');
      this.otpInput = document.getElementById('otp');
      this.sendOtpBtn = document.getElementById('send-otp-btn');
      this.signinTab = document.getElementById('signin-tab');
      this.signupTab = document.getElementById('signup-tab');
      this.signinForm = document.getElementById('signin-form');
      this.signupForm = document.getElementById('signup-form');
      
      this.generatedOtp = null; // Store generated OTP for verification
      
      this.init();
    }
  
    init() {
      if (this.loginBtn) {
        this.loginBtn.addEventListener('click', () => {
          this.showModal();
        });
      }
      if (this.closeBtn) this.closeBtn.addEventListener('click', this.hideModal.bind(this));
      if (this.modal) this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.hideModal();
      });
      if (this.sendOtpBtn) this.sendOtpBtn.addEventListener('click', this.handleSendOtp.bind(this));
      if (this.otpLoginForm) this.otpLoginForm.addEventListener('submit', this.handleVerifyOtp.bind(this));
      if (this.signinTab) this.signinTab.addEventListener('click', this.showSignInForm.bind(this));
      if (this.signupTab) this.signupTab.addEventListener('click', this.showSignUpForm.bind(this));
      if (this.signinForm) this.signinForm.addEventListener('submit', this.handleSignIn.bind(this));
      if (this.signupForm) this.signupForm.addEventListener('submit', this.handleSignUp.bind(this));
    }
  
    showModal() {
      this.modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      this.showSignInForm();
      this.resetOtpForm();
    }
  
    hideModal() {
      this.modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  
    resetOtpForm() {
      this.mobileInputSection.classList.remove('hidden');
      this.otpInputSection.classList.add('hidden');
      this.mobileNumberInput.value = '';
      this.otpInput.value = '';
      this.generatedOtp = null;
    }
  
    handleSendOtp() {
      const mobile = this.mobileNumberInput.value.trim();
      if (!/^\d{10}$/.test(mobile)) {
        alert('Please enter a valid 10-digit mobile number.');
        return;
      }
      // Generate a 6-digit OTP (for demo purposes)
      this.generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      alert(`OTP sent to ${mobile}: ${this.generatedOtp} (for demo purposes)`);
  
      // Show OTP input section
      this.mobileInputSection.classList.add('hidden');
      this.otpInputSection.classList.remove('hidden');
    }
  
    handleVerifyOtp(event) {
      event.preventDefault();
      const enteredOtp = this.otpInput.value.trim();
      if (enteredOtp === this.generatedOtp) {
        alert('OTP verified successfully! You are now logged in.');
        localStorage.setItem('currentUser', JSON.stringify({
          mobile: this.mobileNumberInput.value.trim(),
          loggedInAt: new Date().toISOString()
        }));
        this.hideModal();
        updateAuthState();
      } else {
        alert('Invalid OTP. Please try again.');
      }
    }

    showSignInForm() {
      this.signinForm.classList.remove('hidden');
      this.signupForm.classList.add('hidden');
      this.otpLoginForm.classList.add('hidden');
      this.signinTab.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600');
      this.signinTab.classList.remove('text-gray-500');
      this.signupTab.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-600');
      this.signupTab.classList.add('text-gray-500');
    }

    showSignUpForm() {
      this.signinForm.classList.add('hidden');
      this.signupForm.classList.remove('hidden');
      this.otpLoginForm.classList.add('hidden');
      this.signupTab.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600');
      this.signupTab.classList.remove('text-gray-500');
      this.signinTab.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-600');
      this.signinTab.classList.add('text-gray-500');
    }

    async handleSignIn(event) {
      event.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value.trim();
      if (!email || !password) {
        alert('Please enter both email and password.');
        return;
      }
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
          alert(`Signed in as ${data.user.email}`);
          localStorage.setItem('currentUser', JSON.stringify(data.user));
          this.hideModal();
          updateAuthState();
        } else {
          alert(data.error || 'Login failed');
        }
      } catch (error) {
        alert('Error connecting to server');
      }
    }

    async handleSignUp(event) {
      event.preventDefault();
      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value.trim();
      if (!name || !email || !password) {
        alert('Please fill in all sign up fields.');
        return;
      }
      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
        const data = await response.json();
        if (response.ok) {
          alert(`Signed up as ${name} (${email})`);
          localStorage.setItem('currentUser', JSON.stringify({ name, email }));
          this.hideModal();
          updateAuthState();
        } else {
          alert(data.error || 'Sign up failed');
        }
      } catch (error) {
        alert('Error connecting to server');
      }
    }
  }
  
  // Track authentication state
  function updateAuthState() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const loginBtn = document.getElementById('login-btn');
    if (user && loginBtn) {
      loginBtn.innerHTML = `
          <div class="flex items-center text-purple-600">
              <i class="fas fa-sign-out-alt text-2xl mr-2"></i>
              <span class="font-medium">Log Out</span>
          </div>
      `;
      loginBtn.title = `Logout (${user.email || user.mobile || 'User'})`;
      loginBtn.onclick = handleLogout;
    } else if (loginBtn) {
      loginBtn.innerHTML = `
          <div class="flex items-center text-purple-600">
              <i class="fas fa-user-circle text-2xl mr-2"></i>
              <span class="font-medium">Log In</span>
          </div>
      `;
      loginBtn.title = 'Login';
      // Re-attach event listener for login button
      loginBtn.onclick = () => {
        const authModal = new AuthModal();
        authModal.showModal();
      };
    }
  }
  
  // Handle logout
  function handleLogout() {
    localStorage.removeItem('currentUser');
    updateAuthState();
    alert('You have been logged out.');
  }

  // Scroll to contact form function
  window.scrollToContactForm = function() {
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
      contactForm.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Booking form submission
  const bookingForm = document.querySelector('#contact-form form');
  if (bookingForm) {
    bookingForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const full_name = document.getElementById('full_name').value.trim();
      const ageYears = parseInt(document.getElementById('child_age_years').value.trim());
      const ageMonths = parseInt(document.getElementById('child_age_months').value.trim());
      const city = document.getElementById('city').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const message = document.getElementById('message').value.trim();

      // Validate 10-digit mobile number
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(phone)) {
        alert('Please enter a valid 10-digit mobile number.');
        return;
      }

      // Validate age months range
      if (isNaN(ageMonths) || ageMonths < 0 || ageMonths > 11) {
        alert('Please enter valid months between 0 and 11.');
        return;
      }

      // Validate age years
      if (isNaN(ageYears) || ageYears < 0) {
        alert('Please enter a valid age in years.');
        return;
      }

      const child_age = ageYears + (ageMonths / 12);

      if (!full_name || isNaN(child_age) || !city || !phone) {
        alert('Please fill in all required fields.');
        return;
      }

      try {
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name, child_age_years: ageYears, child_age_months: ageMonths, city, phone, message })
        });
        const data = await response.json();
        if (response.ok) {
          alert('Booking submitted successfully!');
          bookingForm.reset();
        } else {
          alert(data.error || 'Booking submission failed');
        }
      } catch (error) {
        alert('Error connecting to server');
      }
    });
  }

  // Initialize when DOM is ready
  new AuthModal();
  updateAuthState();
});