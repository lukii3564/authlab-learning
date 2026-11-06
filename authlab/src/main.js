
import './style.css';

import { auth, db } from './firebase.js';

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile
} from 'firebase/auth';

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';

// DOM elements
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');

const formTitle = document.getElementById('form-title');
const formSubtitle = document.getElementById('form-subtitle');

const authForm = document.getElementById('auth-form');

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

const confirmPasswordGroup =
  document.getElementById('confirm-password-group');

const confirmPassword =
  document.getElementById('confirm-password');


const togglePassword =
  document.getElementById('toggle-password');

const submitButton =
  document.getElementById('submit-button');

const authMessage =
  document.getElementById('auth-message');

  const forgotPassword =
  document.getElementById('forgot-password');

const themeToggle =
  document.getElementById('theme-toggle');

const themeToggleIcon =
  document.getElementById('theme-toggle-icon');

const themeToggleLabel =
  document.getElementById('theme-toggle-label');

const dashboardThemeToggle =
  document.getElementById('dashboard-theme-toggle');

const dashboardThemeToggleIcon =
  document.getElementById('dashboard-theme-toggle-icon');

const dashboardThemeToggleLabel =
  document.getElementById('dashboard-theme-toggle-label');

const verificationNotice =
  document.getElementById('verification-notice');

const resendVerificationButton =
  document.getElementById('resend-verification');

let currentMode = 'login';

const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');

const userEmail = document.getElementById('user-email');
const userUid = document.getElementById('user-uid');

const logoutButton = document.getElementById('logout-button');
const topbarLogoutButton = document.getElementById('topbar-logout-button');
const logoutMessage = document.getElementById('logout-message');
const profileNameInput = document.getElementById('profile-name');
const saveProfileNameButton = document.getElementById('save-profile-name');
const profileAvatarPreview = document.getElementById('profile-avatar-preview');
const profileMessage = document.getElementById('profile-message');
const avatarOptions = document.querySelectorAll('.avatar-option');
const sidebarProfileName = document.getElementById('sidebar-profile-name');
const sidebarProfileEmail = document.getElementById('sidebar-profile-email');
const sidebarAvatar = document.getElementById('sidebar-avatar');
const topbarProfileName = document.getElementById('topbar-profile-name');
const topbarProfileEmail = document.getElementById('topbar-profile-email');
const topbarAvatar = document.getElementById('topbar-avatar');
const dashboardGreeting = document.getElementById('dashboard-greeting');
const dashboardGreetingHeading = document.getElementById('dashboard-greeting-heading');
const dashboardDate = document.getElementById('dashboard-date');
const mobileMenuButton = document.getElementById('mobile-menu-button');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');
const dashboardSidebar = document.getElementById('dashboard-sidebar');
const dashboardSearchInput = document.getElementById('dashboard-search-input');
const activityRows = document.querySelectorAll('#orders tbody tr');
const chartPeriodButtons = document.querySelectorAll('.chart-period');
let revenueChart;
let trafficChart;
let chartInitializationPromise;
const DEFAULT_AVATAR = '🙂';
let selectedAvatar = DEFAULT_AVATAR;

function updateDashboardGreeting(displayName) {
  const hour = new Date().getHours();
  let greeting;
  let period;

  if (hour >= 5 && hour < 12) {
    greeting = 'Good morning';
    period = 'morning';
  } else if (hour >= 12 && hour < 17) {
    greeting = 'Good afternoon';
    period = 'afternoon';
  } else {
    greeting = 'Good evening';
    period = 'evening';
  }

  const name = typeof displayName === 'string' ? displayName.trim() : '';
  dashboardGreeting.textContent = name ? `${greeting}, ${name} 👋` : greeting;
  dashboardGreetingHeading.dataset.timePeriod = period;
}

function updateProfileIdentity(user, displayName = user.displayName) {
  const name = displayName || user.email?.split('@')[0] || 'Your profile';
  const email = user.email || '';
  updateDashboardGreeting(displayName);
  sidebarProfileName.textContent = name;
  sidebarProfileEmail.textContent = email;
  topbarProfileName.textContent = name;
  topbarProfileEmail.textContent = email;
  sidebarAvatar.textContent = selectedAvatar;
  topbarAvatar.textContent = selectedAvatar;
}

function closeMobileNavigation() {
  dashboardSidebar.classList.remove('mobile-open');
  sidebarBackdrop.classList.remove('visible');
  mobileMenuButton.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('navigation-open');
}

function updateThemeControls(isLightMode) {
  const nextMode = isLightMode ? 'dark' : 'light';
  const icon = isLightMode ? '☾' : '☀';
  const label = `${nextMode[0].toUpperCase()}${nextMode.slice(1)} mode`;

  const controls = [
    { button: themeToggle, icon: themeToggleIcon, label: themeToggleLabel },
    {
      button: dashboardThemeToggle,
      icon: dashboardThemeToggleIcon,
      label: dashboardThemeToggleLabel
    }
  ];

  for (const { button, icon: controlIcon, label: controlLabel } of controls) {
    button.setAttribute('aria-label', `Switch to ${nextMode} mode`);
    controlIcon.textContent = icon;
    controlLabel.textContent = label;
  } 
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('authlab-theme', theme);
  updateThemeControls(theme === 'light');
  updateDashboardChartTheme();
}

const savedTheme = localStorage.getItem('authlab-theme');
const initialTheme = savedTheme === 'dark' ? 'dark' : 'light';
document.documentElement.dataset.theme = initialTheme;
updateThemeControls(initialTheme === 'light');

function toggleTheme() {
  const isLightMode = document.documentElement.dataset.theme !== 'light';
  setTheme(isLightMode ? 'light' : 'dark');
}

// Keep both theme controls synchronized across the login and dashboard views.
themeToggle.addEventListener('click', toggleTheme);
dashboardThemeToggle.addEventListener('click', toggleTheme);

// Display feedback messages
function showMessage(message, type = 'error') {
  authMessage.textContent = message;
  authMessage.className = `message ${type}`;
}

function showProfileMessage(message, type = 'success') {
  profileMessage.textContent = message;
  profileMessage.className = `message ${type}`;
}

function updateAvatarSelection(avatar) {
  selectedAvatar = avatar;
  profileAvatarPreview.textContent = avatar;
  profileAvatarPreview.setAttribute('aria-label', `Selected avatar ${avatar}`);
  const user = auth.currentUser;
  if (user) updateProfileIdentity(user, profileNameInput.value.trim() || user.displayName);

  for (const option of avatarOptions) {
    const isSelected = option.dataset.avatar === avatar;
    option.classList.toggle('selected', isSelected);
    option.setAttribute('aria-pressed', String(isSelected));
  }
}

// Load the saved profile or create a Firestore document from Auth defaults.
async function loadUserProfile(user) {
  const userDocument = doc(db, 'users', user.uid);
  const profileSnapshot = await getDoc(userDocument);
  const defaultProfile = {
    displayName: user.displayName || '',
    avatar: DEFAULT_AVATAR
  };

  if (profileSnapshot.exists()) {
    const profile = profileSnapshot.data();
    const avatar = Array.from(avatarOptions).some(
      (option) => option.dataset.avatar === profile.avatar
    ) ? profile.avatar : DEFAULT_AVATAR;

    profileNameInput.value = profile.displayName || defaultProfile.displayName;
    updateAvatarSelection(avatar);
    updateProfileIdentity(user, profileNameInput.value);
    return;
  }

  profileNameInput.value = defaultProfile.displayName;
  updateAvatarSelection(defaultProfile.avatar);
  updateProfileIdentity(user, defaultProfile.displayName);
  await setDoc(userDocument, {
    ...defaultProfile,
    updatedAt: serverTimestamp()
  });
}

// Keep the Firebase Auth display name and Firestore profile in sync.
async function saveProfileName() {
  const user = auth.currentUser;
  const displayName = profileNameInput.value.trim();

  if (!user) {
    showProfileMessage('Sign in again before saving your profile.', 'error');
    return;
  }

  if (!displayName) {
    showProfileMessage('Enter a display name before saving.', 'error');
    profileNameInput.focus();
    return;
  }

  saveProfileNameButton.disabled = true;
  profileMessage.className = 'message';

  try {
    await updateProfile(user, { displayName });
  } catch (error) {
    console.error('Firebase Auth profile update error:', error);
    showProfileMessage('Could not update your Firebase profile. Please try again.', 'error');
    saveProfileNameButton.disabled = false;
    return;
  }

  updateProfileIdentity(user, displayName);

  try {
    await setDoc(doc(db, 'users', user.uid), {
      displayName,
      avatar: selectedAvatar,
      updatedAt: serverTimestamp()
    }, { merge: true });
    showProfileMessage('Saved');
  } catch (error) {
    console.error('Firestore profile name save error:', error);
    showProfileMessage(
      error.code === 'permission-denied'
        ? 'Name updated in Firebase Auth, but Firestore denied the save. Check the security rules.'
        : 'Name updated in Firebase Auth, but Firestore could not save it. Please try again.',
      'error'
    );
  } finally {
    saveProfileNameButton.disabled = false;
  }
}

// Save avatar choices immediately without changing the display name.
async function saveProfileAvatar(avatar) {
  const user = auth.currentUser;

  if (!user) {
    showProfileMessage('Sign in again before changing your avatar.', 'error');
    return;
  }

  for (const option of avatarOptions) {
    option.disabled = true;
  }
  profileMessage.className = 'message';

  try {
    await setDoc(doc(db, 'users', user.uid), {
      avatar,
      updatedAt: serverTimestamp()
    }, { merge: true });
    updateAvatarSelection(avatar);
    showProfileMessage('Saved');
  } catch (error) {
    console.error('Profile avatar save error:', error);
    showProfileMessage(
      error.code === 'permission-denied'
        ? 'Could not save your avatar. Check the Firestore security rules.'
        : 'Could not save your avatar. Please try again.',
      'error'
    );
  } finally {
    for (const option of avatarOptions) {
      option.disabled = false;
    }
  }
}

saveProfileNameButton.addEventListener('click', saveProfileName);

for (const option of avatarOptions) {
  option.addEventListener('click', () => {
    saveProfileAvatar(option.dataset.avatar);
  });
}

// Switch between login and registration
function switchMode(mode) {
  currentMode = mode;

  authMessage.className = 'message';
  authMessage.textContent = '';

  authForm.reset();

  passwordInput.type = 'password';
  togglePassword.textContent = 'Show';

  if (mode === 'login') {

    formTitle.textContent = 'Welcome back';
    formSubtitle.textContent = 'Sign in to access your account.';

    submitButton.textContent = 'Sign In';

    loginTab.classList.add('active');
    registerTab.classList.remove('active');

    confirmPasswordGroup.classList.add('hidden');
    confirmPassword.required = false;

    forgotPassword.classList.remove('hidden');
    passwordInput.autocomplete = 'current-password';

  } else {

    formTitle.textContent = 'Create your account';
    formSubtitle.textContent = 'Join AuthLab and get started today.';

    submitButton.textContent = 'Create Account';

    registerTab.classList.add('active');
    loginTab.classList.remove('active');

    confirmPasswordGroup.classList.remove('hidden');
    confirmPassword.required = true;

    forgotPassword.classList.add('hidden');
    passwordInput.autocomplete = 'new-password';
  }
}

// Switch tabs
loginTab.addEventListener('click', () => {
  switchMode('login');
});

registerTab.addEventListener('click', () => {
  switchMode('register');
});

// Show / hide password
togglePassword.addEventListener('click', () => {
  const isHidden = passwordInput.type === 'password';

  passwordInput.type = isHidden ? 'text' : 'password';

  togglePassword.textContent = isHidden ? 'Hide' : 'Show';
});

// Firebase error handling
function getFirebaseErrorMessage(error) {

  const errors = {
    'auth/email-already-in-use':
      'This email is already registered. Try signing in.',

    'auth/invalid-email':
      'Please enter a valid email address.',

    'auth/weak-password':
      'Your password is too weak. Use at least 6 characters.',

    'auth/invalid-credential':
      'Incorrect email or password.',

    'auth/user-not-found':
      'No account was found with these credentials.',

    'auth/wrong-password':
      'Incorrect email or password.',

    'auth/too-many-requests':
      'Too many attempts. Please try again later.',

    'auth/network-request-failed':
      'Network error. Check your internet connection.'
  };

  return errors[error.code] ||
    `Authentication failed. Please try again. (${error.code || 'unknown error'})`;
}

// Registration with email verification
async function registerUser(email, password) {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  const user = userCredential.user;

  // Send verification email
  await sendEmailVerification(user);

  return user;
}

// Login
async function loginUser(email, password) {

  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  return userCredential.user;
}


// Send password reset email
async function resetUserPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// Handle form submission
authForm.addEventListener('submit', async (event) => {

  event.preventDefault();

  if (submitButton.disabled) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  const confirmPasswordValue = confirmPassword.value;

  // Validate registration password confirmation
  if (
    currentMode === 'register' &&
    password !== confirmPasswordValue
  ) {
    showMessage('Your passwords do not match.');
    return;
  }

  submitButton.disabled = true;

  submitButton.textContent =
    currentMode === 'register'
      ? 'Creating account...'
      : 'Signing in...';

  authMessage.className = 'message';

  try {

    let user;

    if (currentMode === 'register') {

      user = await registerUser(email, password);

     showMessage(
  `Account created! A verification email has been sent to ${user.email}. Please check your inbox.`,
  'success'
);

    } else {

      user = await loginUser(email, password);

      showMessage(
        `Login successful! Welcome back, ${user.email}.`,
        'success'
      );

    }

    // Inspect the authenticated Firebase user
    console.log('Authenticated user:', user);

    console.log('User UID:', user.uid);

    console.log('User email:', user.email);

  } catch (error) {

    console.error('Authentication error:', error);

    showMessage(getFirebaseErrorMessage(error));

  } finally {

    submitButton.disabled = false;

    submitButton.textContent =
      currentMode === 'register'
        ? 'Create Account'
        : 'Sign In';

  }


});

// Monitor Firebase authentication state
onAuthStateChanged(auth, async (user) => {

  if (user) {

    // Refresh user information from Firebase
    await user.reload();

    // Get the latest user information
    const updatedUser = auth.currentUser;

    authContainer.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    try {
      await initializeDashboardCharts();
    } catch (error) {
      console.error('Dashboard chart initialization error:', error);
      const chartError = document.getElementById('chart-error');
      chartError.textContent = 'Analytics charts could not load. Refresh to try again.';
      chartError.className = 'message error';
    }

    userEmail.textContent = updatedUser.email;
    userUid.textContent = updatedUser.uid;
    updateProfileIdentity(updatedUser);
    dashboardDate.textContent = new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date());

    try {
      await loadUserProfile(updatedUser);
    } catch (error) {
      console.error('Profile load error:', error);
      showProfileMessage('Could not load your saved profile. Please refresh to try again.', 'error');
      document.getElementById('profile-settings').open = true;
    }

    if (updatedUser.emailVerified) {

      verificationNotice.classList.add('hidden');

      console.log('EMAIL VERIFIED');
      console.log('Access granted to verified user.');

    } else {

      verificationNotice.classList.remove('hidden');

      console.log('EMAIL NOT VERIFIED');
      console.log('User must verify their email.');

    }

  } else {

    authContainer.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');

    console.log('NO USER IS SIGNED IN');

  }

});
// Forgot password functionality
forgotPassword.addEventListener('click', async () => {
  const email = emailInput.value.trim();

  if (!email) {
    showMessage('Please enter your email address first.');
    emailInput.focus();
    return;
  }

  try {
    forgotPassword.textContent = 'Sending...';
    forgotPassword.style.pointerEvents = 'none';

    await resetUserPassword(email);

    showMessage(
      'If an account exists for this email, a password reset link will be sent.',
      'success'
    );

  } catch (error) {
    console.error('Password reset error:', error);

    showMessage(getFirebaseErrorMessage(error));

  } finally {
    forgotPassword.textContent = 'Forgot password?';
    forgotPassword.style.pointerEvents = 'auto';
  }
});


// Logout functionality
logoutButton.addEventListener('click', async () => {
  logoutButton.disabled = true;
  logoutMessage.textContent = '';
  logoutMessage.className = 'message';

  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    logoutMessage.textContent = 'Unable to sign out. Please try again.';
    logoutMessage.className = 'message error';
  } finally {
    logoutButton.disabled = false;
  }
});

topbarLogoutButton.addEventListener('click', () => logoutButton.click());

mobileMenuButton.addEventListener('click', () => {
  const isOpen = dashboardSidebar.classList.toggle('mobile-open');
  sidebarBackdrop.classList.toggle('visible', isOpen);
  mobileMenuButton.setAttribute('aria-expanded', String(isOpen));
  document.body.classList.toggle('navigation-open', isOpen);
});

sidebarBackdrop.addEventListener('click', closeMobileNavigation);

for (const link of document.querySelectorAll('.dashboard-nav a')) {
  link.addEventListener('click', () => {
    if (link.hash === '#profile-settings') {
      document.getElementById('profile-settings').open = true;
    }
    document.querySelectorAll('.dashboard-nav a').forEach((navLink) => {
      navLink.classList.remove('active');
      navLink.removeAttribute('aria-current');
    });
    link.classList.add('active');
    link.setAttribute('aria-current', 'page');
    closeMobileNavigation();
  });
}

for (const link of document.querySelectorAll('a[href="#profile-settings"]:not(.nav-link)')) {
  link.addEventListener('click', () => {
    document.getElementById('profile-settings').open = true;
  });
}

dashboardSearchInput.addEventListener('input', () => {
  const query = dashboardSearchInput.value.trim().toLowerCase();
  for (const row of activityRows) {
    row.hidden = !row.textContent.toLowerCase().includes(query);
  }
});

const chartSeries = {
  7: {
    total: '$12,486',
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    values: [2100, 2600, 2350, 3450, 3150, 4200, 4800]
  },
  30: {
    total: '$48,294',
    labels: ['Oct 8', 'Oct 13', 'Oct 18', 'Oct 23', 'Oct 28', 'Nov 2', 'Nov 6'],
    values: [1450, 2350, 2050, 3350, 2850, 4050, 4850]
  }
};

function getDashboardChartColors() {
  const styles = getComputedStyle(dashboardContainer);
  return {
    text: styles.getPropertyValue('--dash-muted').trim(),
    grid: styles.getPropertyValue('--dash-border').trim(),
    surface: styles.getPropertyValue('--dash-surface').trim()
  };
}

async function initializeDashboardCharts() {
  if (!chartInitializationPromise) {
    chartInitializationPromise = import('chart.js/auto').then(({ default: Chart }) => {
      const colors = getDashboardChartColors();
      revenueChart = new Chart(document.getElementById('revenue-chart'), {
        type: 'line',
        data: {
          labels: chartSeries[7].labels,
          datasets: [{
            label: 'Revenue',
            data: chartSeries[7].values,
            borderColor: '#635bff',
            backgroundColor: 'rgba(99, 91, 255, 0.12)',
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: '#635bff',
            fill: true,
            tension: 0.38
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: 'index' },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => ` $${context.parsed.y.toLocaleString()}`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: { color: colors.text, font: { family: 'Inter', size: 9 }, maxRotation: 0 }
            },
            y: {
              min: 0,
              max: 5000,
              ticks: {
                stepSize: 1000,
                color: colors.text,
                font: { family: 'Inter', size: 9 },
                callback: (value) => `$${value / 1000}k`
              },
              grid: { color: colors.grid },
              border: { display: false }
            }
          }
        }
      });

      trafficChart = new Chart(document.getElementById('traffic-chart'), {
        type: 'doughnut',
        data: {
          labels: ['Direct', 'Social media', 'Search engines', 'Referral'],
          datasets: [{
            data: [42, 28, 18, 12],
            backgroundColor: ['#635bff', '#48a0eb', '#f2b84b', '#47b88a'],
            borderColor: colors.surface,
            borderWidth: 2,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '73%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => ` ${context.label}: ${context.parsed}%`
              }
            }
          }
        }
      });
    });
  }

  await chartInitializationPromise;
  chartPeriodButtons.forEach((button) => {
    button.disabled = false;
  });
  revenueChart.resize();
  trafficChart.resize();
}

function updateDashboardChartTheme() {
  if (!revenueChart || !trafficChart) return;
  const colors = getDashboardChartColors();
  revenueChart.options.scales.x.ticks.color = colors.text;
  revenueChart.options.scales.y.ticks.color = colors.text;
  revenueChart.options.scales.y.grid.color = colors.grid;
  trafficChart.data.datasets[0].borderColor = colors.surface;
  revenueChart.update('none');
  trafficChart.update('none');
}

function renderRevenueChart(period) {
  const series = chartSeries[period];
  revenueChart.data.labels = series.labels;
  revenueChart.data.datasets[0].data = series.values;
  revenueChart.update();
  document.getElementById('chart-total').textContent = series.total;
  document.getElementById('revenue-chart').setAttribute(
    'aria-label',
    `Revenue trend over the last ${period} days`
  );
}

for (const button of chartPeriodButtons) {
  button.addEventListener('click', () => {
    chartPeriodButtons.forEach((periodButton) => periodButton.classList.remove('active'));
    button.classList.add('active');
    renderRevenueChart(button.dataset.period);
  });
}

// Resend verification email
resendVerificationButton.addEventListener('click', async () => {

  const user = auth.currentUser;

  if (!user) {
    showMessage('Please sign in first.');
    return;
  }

  try {

    await user.reload();

    const updatedUser = auth.currentUser;

    if (updatedUser.emailVerified) {

      showMessage('Your email is already verified.', 'success');

      verificationNotice.classList.add('hidden');

      return;
    }

    await sendEmailVerification(updatedUser);

    showMessage(
      'A new verification email has been sent.',
      'success'
    );

  } catch (error) {

    console.error('Verification error:', error);

    showMessage(
      'Unable to send verification email. Please try again.'
    );

  }

});
