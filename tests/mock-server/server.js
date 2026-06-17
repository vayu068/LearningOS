const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Common page layout wrapper
function layout(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - LearningOS</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; line-height: 1.5; color: #1a1a1a; }
    a { color: #1a73e8; text-decoration: none; min-height: 44px; display: inline-block; line-height: 44px; }
    a:focus, button:focus, input:focus, select:focus { outline: 2px solid #1a73e8; outline-offset: 2px; }
    button, input, select { min-height: 44px; min-width: 44px; padding: 8px 16px; font-size: 16px; }
    button { cursor: pointer; background: #1a73e8; color: white; border: none; border-radius: 4px; }
    input, select { border: 1px solid #ccc; border-radius: 4px; width: 100%; }
    label { display: block; margin-bottom: 4px; font-weight: 500; }
    .form-group { margin-bottom: 16px; }
    .error-message { color: #d32f2f; margin-top: 4px; }
    nav { background: #1a73e8; padding: 12px 24px; }
    nav a { color: white; margin-right: 16px; }
    main { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0; }
    th { background: #f5f5f5; font-weight: 600; }
  </style>
  <script>
    // Auth state management - must be in head so auth checks work immediately
    function getAuthState() {
      try { return JSON.parse(localStorage.getItem('auth_state')); } catch(e) { return null; }
    }
    function isAuthenticated() {
      const state = getAuthState();
      return state && state.accessToken && state.expiresAt > Date.now();
    }
    function getCurrentUser() {
      const state = getAuthState();
      return state ? state.user : null;
    }
    function requireAuth() {
      if (!isAuthenticated()) {
        window.location.href = '/auth/login';
        return false;
      }
      return true;
    }
  </script>
</head>
<body>
  <a href="#main" class="skip-link" style="position:absolute;left:-9999px;top:0;z-index:999;">Skip to content</a>
  ${body}
  <script>
    // Update user-specific elements
    function updateAuthUI() {
      const user = getCurrentUser();
      if (user) {
        document.querySelectorAll('.user-name').forEach(el => { el.textContent = user.fullName; });
        document.querySelectorAll('.user-email').forEach(el => { el.textContent = user.email; });
        document.querySelectorAll('.auth-required').forEach(el => { el.style.display = 'block'; });
        document.querySelectorAll('.auth-hide').forEach(el => { el.style.display = 'none'; });
      }
    }
    document.addEventListener('DOMContentLoaded', updateAuthUI);
  </script>
</body>
</html>`;
}
// Authenticated page layout with nav
function authLayout(title, content) {
  return layout(title, `
  <script>
    // Auth check must run before page renders
    if (!isAuthenticated()) {
      window.location.replace('/auth/login');
    }
  </script>
  <nav role="navigation" aria-label="Main navigation">
    <a href="/dashboard">Home</a>
    <a href="/learn">Learn</a>
    <a href="/assessments">Tests</a>
    <a href="/analytics">Reports</a>
    <a href="/communication">Messages</a>
    <a href="/content/create">Create</a>
    <a href="/profile">Profile</a>
    <a href="/settings/dpi">Settings</a>
    <a href="/admin/users">Admin</a>
  </nav>
  <main id="main" role="main">
    <div data-testid="user-menu" tabindex="0" role="button" aria-label="User menu" style="position:fixed;top:12px;right:24px;background:#fff;padding:8px 16px;border-radius:4px;cursor:pointer;min-height:44px;min-width:44px;">
      <div role="menu" style="display:none;position:absolute;top:100%;right:0;background:#fff;border:1px solid #ccc;border-radius:4px;padding:8px;" aria-modal="true">
        <a href="/profile" role="menuitem">Profile</a>
        <button onclick="localStorage.removeItem('auth_state');window.location.href='/auth/login'" role="menuitem">Log out</button>
      </div>
    </div>
    <script>
      document.querySelector('[data-testid=user-menu]').addEventListener('click', function() {
        var menu = this.querySelector('[role=menu]');
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
      });
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          document.querySelectorAll('[role=menu]').forEach(function(m) { m.style.display = 'none'; });
        }
      });
    </script>
    ${content}
  </main>`);
}
// ===== HOME PAGE =====
app.get('/', (req, res) => {
  res.send(layout('Home', `
  <nav role="navigation" aria-label="Main navigation">
    <a href="/">Home</a>
    <a href="/auth/login">Login</a>
    <a href="/auth/register">Register</a>
  </nav>
  <main id="main" role="main">
    <h1>LearningOS</h1>
    <p>Digital Public Infrastructure for Education</p>
    <p>A comprehensive learning platform built on open standards and interoperability principles.</p>
    <img src="/images/hero.png" alt="LearningOS Platform Hero Image" />
  </main>`));
});

// ===== AUTH PAGES =====
app.get('/auth/login', (req, res) => {
  res.send(layout('Login', `
  <main id="main" role="main">
    <h1>Sign In</h1>
    <form id="login-form" method="POST" action="/auth/login" novalidate>
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required aria-required="true" />
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required aria-required="true" />
      </div>
      <div id="error-container" role="alert" aria-live="assertive"></div>
      <button type="submit">Sign In</button>
      <p style="margin-top:16px;"><a href="/auth/forgot-password">Forgot password?</a></p>
      <p><a href="/auth/register">Create an account</a></p>
    </form>
  </main>
  <script>
    document.getElementById('login-form').addEventListener('submit', function(e) {
      e.preventDefault();
      var email = document.getElementById('email').value;
      var password = document.getElementById('password').value;
      var errorContainer = document.getElementById('error-container');
      errorContainer.innerHTML = '';

      // Validate email format
      var emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
      if (!emailRegex.test(email)) {
        errorContainer.innerHTML = '<p class="error-message" role="alert">Please enter a valid email address</p>';
        return;
      }

      // Check known test users
      var validUsers = {
        'student@test-district.platform.gov.in': { password: 'Test@Student123', fullName: 'Aarav Sharma', role: 'student' },
        'teacher@test-district.platform.gov.in': { password: 'Test@Teacher123', fullName: 'Priya Patel', role: 'teacher' },
        'admin@test-district.platform.gov.in': { password: 'Test@Admin123', fullName: 'Rajesh Kumar', role: 'admin' },
        'guardian@test-district.platform.gov.in': { password: 'Test@Guardian123', fullName: 'Meera Sharma', role: 'student' }
      };

      var user = validUsers[email];
      if (user && user.password === password) {
        localStorage.setItem('auth_state', JSON.stringify({
          accessToken: 'mock-access-token-' + user.role,
          refreshToken: 'mock-refresh-token-' + user.role,
          user: { id: 'user-' + user.role + '-001', email: email, fullName: user.fullName, role: user.role, tenantId: 'test-tenant-001' },
          expiresAt: Date.now() + 3600000
        }));
        window.location.href = '/dashboard';
      } else {
        errorContainer.innerHTML = '<p class="error-message" role="alert">Invalid credentials. Please try again.</p>';
      }
    });
  </script>`));
});
// ===== REGISTER PAGE =====
app.get('/auth/register', (req, res) => {
  res.send(layout('Register', `
  <main id="main" role="main">
    <h1>Create Account</h1>
    <form id="register-form" method="POST" action="/auth/register" novalidate>
      <div class="form-group">
        <label for="fullName">Full Name</label>
        <input type="text" id="fullName" name="fullName" required aria-required="true" />
      </div>
      <div class="form-group">
        <label for="reg-email">Email</label>
        <input type="email" id="reg-email" name="email" required aria-required="true" />
      </div>
      <div class="form-group">
        <label for="reg-password">Password</label>
        <input type="password" id="reg-password" name="password" required aria-required="true" />
        <div id="password-strength"></div>
      </div>
      <div class="form-group">
        <label for="confirmPassword">Confirm Password</label>
        <input type="password" id="confirmPassword" name="confirmPassword" required aria-required="true" />
      </div>
      <div class="form-group">
        <label for="role">Role</label>
        <select id="role" name="role" required aria-required="true">
          <option value="">Select a role</option>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div id="reg-error-container" role="alert" aria-live="assertive"></div>
      <button type="submit">Register</button>
    </form>
  </main>
  <script>
    var passwordInput = document.getElementById('reg-password');
    var strengthDiv = document.getElementById('password-strength');
    passwordInput.addEventListener('input', function() {
      var val = this.value;
      if (val.length < 6) { strengthDiv.textContent = 'Weak - too short'; }
      else if (val.length < 10) { strengthDiv.textContent = 'Medium'; }
      else { strengthDiv.textContent = 'Strong'; }
    });

    document.getElementById('register-form').addEventListener('submit', function(e) {
      e.preventDefault();
      var email = document.getElementById('reg-email').value;
      var password = document.getElementById('reg-password').value;
      var confirmPassword = document.getElementById('confirmPassword').value;
      var errorContainer = document.getElementById('reg-error-container');
      errorContainer.innerHTML = '';

      if (password !== confirmPassword) {
        errorContainer.innerHTML = '<p class="error-message" role="alert">Passwords do not match</p>';
        return;
      }

      var existingEmails = ['student@test-district.platform.gov.in', 'teacher@test-district.platform.gov.in', 'admin@test-district.platform.gov.in'];
      if (existingEmails.includes(email)) {
        errorContainer.innerHTML = '<p class="error-message" role="alert">An account with this email already exists</p>';
        return;
      }

      errorContainer.innerHTML = '<p style="color:green;">Please confirm your email. A verification link has been sent.</p>';
    });
  </script>`));
});

// ===== FORGOT PASSWORD =====
app.get('/auth/forgot-password', (req, res) => {
  res.send(layout('Forgot Password', `
  <main id="main" role="main">
    <h1>Reset Password</h1>
    <form id="reset-form" novalidate>
      <div class="form-group">
        <label for="reset-email">Email</label>
        <input type="email" id="reset-email" name="email" required aria-required="true" />
      </div>
      <div id="reset-msg" role="alert" aria-live="polite"></div>
      <button type="submit">Send Reset Link</button>
    </form>
    <div id="reset-code-section" style="display:none;">
      <div class="form-group">
        <label for="reset-code">Verification Code</label>
        <input type="text" id="reset-code" name="code" data-testid="reset-code-input" />
      </div>
      <div class="form-group">
        <label for="new-password">New Password</label>
        <input type="password" id="new-password" name="newPassword" />
      </div>
      <div class="form-group">
        <label for="confirm-new">Confirm Password</label>
        <input type="password" id="confirm-new" name="confirmNewPassword" />
      </div>
      <button type="button" id="reset-btn">Reset Password</button>
    </div>
  </main>
  <script>
    document.getElementById('reset-form').addEventListener('submit', function(e) {
      e.preventDefault();
      document.getElementById('reset-msg').innerHTML = '<p>We have sent a reset link. Please check your email.</p>';
      document.getElementById('reset-code-section').style.display = 'block';
    });
    document.getElementById('reset-btn').addEventListener('click', function() {
      document.getElementById('reset-msg').innerHTML = '<p>Password has been reset successfully.</p>';
    });
  </script>`));
});
// ===== DASHBOARD =====
app.get('/dashboard', (req, res) => {
  res.send(authLayout('Dashboard', `
    <h1>Dashboard</h1>
    <span class="user-name"></span>
    <div class="card">
      <h2>Learning Progress</h2>
      <div data-testid="progress-chart" style="height:200px;background:#f0f0f0;border-radius:8px;">
      </div>
    </div>
    <div class="card">
      <h2>Upcoming Assessments</h2>
      <p>Quadratic Equations Quiz - Due Tomorrow</p>
    </div>
    <div class="card">
      <h2>Recent Activity</h2>
      <p>Completed Lesson: Linear Algebra</p>
    </div>
    <div class="card">
      <h2>Subjects</h2>
      <p>Mathematics</p>
      <p>Science</p>
      <p>English</p>
    </div>
    <div class="card">
      <h2>Classes</h2>
      <p>10-A</p>
      <p>10-B</p>
    </div>
    <div class="card">
      <h2>Platform Statistics</h2>
      <p>Total Users: 1,250</p>
      <p>Active Teachers: 45</p>
      <p>Active Students: 1,180</p>
      <p>System Health: All systems operational</p>
    </div>
    <div class="card">
      <h2>Class Feed</h2>
      <p>Latest updates from learners</p>
    </div>
    <div class="card">
      <p>3 pending items to grade</p>
    </div>
    <a href="/learn">AI Tutor - Start Learning</a>
    <table aria-label="Grades summary">
      <caption>Grades Summary</caption>
      <thead><tr><th>Subject</th><th>Score</th></tr></thead>
      <tbody><tr><td>Math</td><td>85%</td></tr></tbody>
    </table>
  `));
});

// ===== LEARN PAGE =====
app.get('/learn', (req, res) => {
  res.send(authLayout('Learn', `
    <h1>Learn</h1>
    <h2>Select a Subject</h2>
    <div class="card" style="cursor:pointer;" onclick="document.getElementById('topics').style.display='block'">
      <h3>Mathematics</h3>
      <p>Algebra, Geometry, Calculus</p>
    </div>
    <div class="card" style="cursor:pointer;">
      <h3>Science</h3>
      <p>Physics, Chemistry, Biology</p>
    </div>
    <div id="topics" style="display:none;">
      <p style="cursor:pointer;" onclick="window.location='/learn/session/new?subject=math-10&topic=topic-quadratic'">Quadratic Equations</p>
    </div>
    <div data-testid="tutor-chat">
      <p>Chat with your AI tutor</p>
    </div>
    <div>
      <select data-testid="language-selector" onchange="if(this.value==='hi'){document.getElementById('lang-display').textContent='\\u0939\\u093f\\u0928\\u094d\\u0926\\u0940';}">
        <option value="en">English</option>
        <option value="hi">Hindi</option>
      </select>
    </div>
    <span id="lang-display"></span>
  `));
});
// ===== LEARN SESSION =====
app.get('/learn/session/new', (req, res) => {
  res.send(authLayout('Tutor Session', `
    <h1>AI Tutor Session</h1>
    <div data-testid="tutor-chat">
      <div data-testid="message-assistant" style="display:none;" class="msg-assistant">
        <p>Welcome! Let us learn about Quadratic Equations.</p>
      </div>
      <div data-testid="typing-indicator" style="display:none;">AI is typing...</div>
      <div data-testid="suggestions" style="display:none;">
        <p>Suggested: What are the roots?</p>
        <p>Suggested: Show me an example</p>
      </div>
      <div style="margin-top:16px;">
        <input type="text" placeholder="Type your message or ask a question..." id="chat-input" style="width:80%;display:inline-block;" />
        <button onclick="sendMessage()" style="width:18%;display:inline-block;">Send</button>
      </div>
    </div>
    <script>
      function sendMessage() {
        var input = document.getElementById('chat-input');
        if (!input.value) return;
        input.value = '';
        document.querySelector('[data-testid=typing-indicator]').style.display = 'block';
        setTimeout(function() {
          document.querySelector('[data-testid=typing-indicator]').style.display = 'none';
          document.querySelector('[data-testid=message-assistant]').style.display = 'block';
          document.querySelector('[data-testid=suggestions]').style.display = 'block';
        }, 500);
      }
    </script>
  `));
});

app.get('/learn/:subject', (req, res) => {
  res.send(authLayout('Learn Subject', `
    <h1>Learn ${req.params.subject}</h1>
    <div data-testid="tutor-chat">
      <p>Select a topic to begin.</p>
    </div>
  `));
});

// ===== ASSESSMENTS =====
app.get('/assessments', (req, res) => {
  res.send(authLayout('Assessments', `
    <h1>Assessments</h1>
    <div class="card">
      <h2>Quadratic Equations Quiz</h2>
      <p>Type: Quiz | Duration: 30 min | Marks: 20</p>
      <button onclick="window.location='/assessments/assessment-001/take'">Start</button>
      <button onclick="document.getElementById('assign-section').style.display='block'">Assign</button>
    </div>
    <div id="assign-section" style="display:none;">
      <div class="form-group">
        <label for="assign-class">Class</label>
        <select id="assign-class"><option value="10-A">10-A</option><option value="10-B">10-B</option></select>
      </div>
      <button onclick="document.getElementById('assign-msg').style.display='block'">Confirm Assignment</button>
      <p id="assign-msg" style="display:none;color:green;">Assigned successfully</p>
    </div>
  `));
});

app.get('/assessments/create', (req, res) => {
  res.send(authLayout('Create Assessment', `
    <h1>Create Assessment</h1>
    <form>
      <div class="form-group"><label for="assess-title">Title</label><input type="text" id="assess-title" name="title" /></div>
      <div class="form-group"><label for="assess-type">Type</label><select id="assess-type" name="type"><option value="quiz">Quiz</option><option value="exam">Exam</option></select></div>
      <div class="form-group"><label for="assess-subject">Subject</label><select id="assess-subject" name="subject"><option value="Mathematics">Mathematics</option><option value="Science">Science</option></select></div>
      <div class="form-group"><label for="assess-duration">Duration (minutes)</label><input type="number" id="assess-duration" name="duration" /></div>
      <button type="submit">Create</button>
    </form>
  `));
});

app.get('/assessments/:id/take', (req, res) => {
  res.send(authLayout('Take Assessment', `
    <h1>Assessment</h1>
    <div data-testid="assessment-timer">Time remaining: 29:45</div>
    <div data-testid="assessment-question">
      <h2>Question 1</h2>
      <p>Solve: x^2 - 5x + 6 = 0</p>
      <div class="form-group">
        <label for="answer">Your Answer</label>
        <input type="text" id="answer" data-testid="answer-input" />
      </div>
    </div>
    <button id="next-btn">Next</button>
    <button id="submit-btn">Submit</button>
    <div id="confirm-dialog" style="display:none;">
      <p>Are you sure you want to submit?</p>
      <button id="confirm-btn">Confirm</button>
    </div>
    <div id="results" style="display:none;"><p>Your score: 18/20 marks</p></div>
    <script>
      var currentQ = 1;
      document.getElementById('next-btn').addEventListener('click', function() {
        currentQ++;
        document.querySelector('[data-testid=assessment-question] h2').textContent = 'Question ' + currentQ;
        if (currentQ >= 2) {
          document.getElementById('submit-btn').style.display = 'inline-block';
        }
      });
      document.getElementById('submit-btn').addEventListener('click', function() {
        document.getElementById('confirm-dialog').style.display = 'block';
      });
      document.getElementById('confirm-btn').addEventListener('click', function() {
        document.getElementById('confirm-dialog').style.display = 'none';
        document.getElementById('results').style.display = 'block';
      });
    </script>
  `));
});

app.get('/assessments/:id/submissions', (req, res) => {
  res.send(authLayout('Submissions', `
    <h1>Submissions</h1>
    <table aria-label="Work table">
      <caption>Student Work</caption>
      <thead><tr><th>Student</th><th>Points</th><th>Status</th></tr></thead>
      <tbody>
        <tr data-testid="submission-row" style="cursor:pointer;" onclick="document.getElementById('grade-section').style.display='block'">
          <td>Aarav Sharma</td><td>-</td><td>Pending</td>
        </tr>
      </tbody>
    </table>
    <div id="grade-section" style="display:none;">
      <h2>Evaluate</h2>
      <p>Grade / score this work</p>
      <div class="form-group"><label for="grade-marks">Marks</label><input type="number" id="grade-marks" /></div>
      <button onclick="document.getElementById('grade-msg').style.display='block'">Save</button>
      <button onclick="document.getElementById('ai-feedback-el').style.display='block'">Generate AI Feedback</button>
      <p id="grade-msg" style="display:none;color:green;">Saved</p>
      <div data-testid="ai-feedback" id="ai-feedback-el" style="display:none;"><p>AI-generated feedback: Good understanding of core concepts.</p></div>
    </div>
  `));
});
// ===== PROFILE =====
app.get('/profile', (req, res) => {
  res.send(authLayout('Profile', `
    <h1>Profile</h1>
    <div class="card">
      <p class="user-name"></p>
      <p class="user-email"></p>
    </div>
  `));
});

app.get('/profile/settings', (req, res) => {
  res.send(authLayout('Profile Settings', `
    <h1>Profile Settings</h1>
    <form id="profile-form">
      <div class="form-group">
        <label for="pref-language">Preferred Language</label>
        <select id="pref-language" name="language">
          <option value="en">English</option>
          <option value="hi">Hindi</option>
        </select>
      </div>
      <button type="submit">Save</button>
      <p id="save-msg" style="display:none;color:green;">Settings saved successfully</p>
    </form>
    <script>
      document.getElementById('profile-form').addEventListener('submit', function(e) {
        e.preventDefault();
        document.getElementById('save-msg').style.display = 'block';
      });
    </script>
  `));
});

// ===== DPI SETTINGS =====
app.get('/settings/dpi', (req, res) => {
  res.send(authLayout('DPI Settings', `
    <h1>DPI Integration Settings</h1>
    <div class="card">
      <h2>APAAR</h2>
      <p>ID: 123456789012</p>
    </div>
    <div class="card">
      <h2>DigiLocker</h2>
      <p>Connect your DigiLocker account to access verified documents.</p>
      <button>Link DigiLocker</button>
    </div>
    <div class="card">
      <h2>Academic Bank of Credits</h2>
      <p>Balance: 42</p>
    </div>
  `));
});

// ===== ANALYTICS =====
app.get('/analytics', (req, res) => {
  res.send(authLayout('Analytics', `
    <h1>Analytics</h1>
    <div data-testid="performance-chart" style="height:200px;background:#f0f0f0;border-radius:8px;">
    </div>
    <div class="form-group">
      <label for="class-filter">Class</label>
      <select id="class-filter" onchange="document.getElementById('filter-results').style.display='block'">
        <option value="10-A">Section A</option>
        <option value="10-B">Section B</option>
      </select>
    </div>
    <div id="filter-results" style="display:none;"><p>Results for 10-A</p></div>
    <div data-testid="date-range-picker" style="cursor:pointer;padding:8px;border:1px solid #ccc;border-radius:4px;display:inline-block;">
      <span>Select Date Range</span>
      <div id="date-options" style="display:none;">
        <p style="cursor:pointer;" onclick="this.parentElement.style.display='none'">Last 7 days</p>
        <p style="cursor:pointer;" onclick="this.parentElement.style.display='none'">Last 30 days</p>
      </div>
    </div>
    <script>
      document.querySelector('[data-testid=date-range-picker]').addEventListener('click', function(e) {
        document.getElementById('date-options').style.display = 'block';
      });
    </script>
    <div class="card">
      <h2>At-Risk Students</h2>
      <p>2 students need attention</p>
      <p style="cursor:pointer;" onclick="document.getElementById('student-detail').style.display='block'">Aarav Sharma</p>
    </div>
    <div id="student-detail" style="display:none;">
      <h2>Student Progress</h2>
      <p>Overall trend is improving</p>
    </div>
    <div class="card">
      <h2>DPI Integrations</h2>
      <p>APAAR Verifications: 1,250 completed</p>
    </div>
    <button onclick="document.getElementById('export-msg').style.display='block'">Export Report</button>
    <p id="export-msg" style="display:none;">Generating CSV report...</p>
  `));
});

// ===== ADMIN ANALYTICS =====
app.get('/admin/analytics', (req, res) => {
  res.send(authLayout('Admin Analytics', `
    <h1>Analytics</h1>
    <div data-testid="date-range-picker" style="cursor:pointer;padding:8px;border:1px solid #ccc;border-radius:4px;display:inline-block;">
      <span>Select Date Range</span>
      <div id="date-opts" style="display:none;">
        <p style="cursor:pointer;">Last 30 days</p>
      </div>
    </div>
    <script>
      document.querySelector('[data-testid=date-range-picker]').addEventListener('click', function() {
        document.getElementById('date-opts').style.display = 'block';
      });
    </script>
    <div class="card"><p>DPI Integrations</p><p>APAAR Verifications: 1,250</p></div>
    <button onclick="document.getElementById('exp-msg').style.display='block'">Export</button>
    <p id="exp-msg" style="display:none;">Generating CSV...</p>
  `));
});
// ===== ADMIN PAGES =====
app.get('/admin/users', (req, res) => {
  res.send(authLayout('User Management', `
    <h1>Users</h1>
    <input type="text" placeholder="Search users..." style="margin-bottom:16px;" />
    <div class="form-group">
      <label for="role-filter">Role</label>
      <select id="role-filter"><option value="">All</option><option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Admin</option></select>
    </div>
    <button onclick="window.location='/admin/users/create'">Import / Bulk Upload</button>
    <table data-testid="user-table" aria-label="Users list">
      <caption>Platform Users</caption>
      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
      <tbody>
        <tr style="cursor:pointer;" onclick="document.getElementById('user-detail').style.display='block'">
          <td>Aarav Sharma</td><td>student@test-district.platform.gov.in</td><td>Student</td><td>Active</td>
        </tr>
        <tr><td>Priya Patel</td><td>teacher@test-district.platform.gov.in</td><td>Teacher</td><td>Active</td></tr>
      </tbody>
    </table>
    <div id="user-detail" style="display:none;">
      <h2>User Details</h2>
      <button onclick="document.getElementById('edit-form').style.display='block'">Edit</button>
      <button onclick="document.getElementById('deact-confirm').style.display='block'">Deactivate</button>
      <div id="edit-form" style="display:none;">
        <div class="form-group"><label for="edit-fullname">Full Name</label><input type="text" id="edit-fullname" value="Aarav Sharma" /></div>
        <div class="form-group"><label for="edit-email2">Email</label><input type="email" id="edit-email2" value="student@test-district.platform.gov.in" /></div>
        <button onclick="document.getElementById('edit-msg').style.display='block'">Save</button>
        <p id="edit-msg" style="display:none;color:green;">Updated successfully</p>
      </div>
      <div id="deact-confirm" style="display:none;">
        <p>Are you sure?</p>
        <button onclick="document.getElementById('deact-msg').style.display='block';document.getElementById('deact-confirm').style.display='none'">Confirm</button>
      </div>
      <p id="deact-msg" style="display:none;color:green;">User deactivated successfully</p>
    </div>
  `));
});

app.get('/admin/users/create', (req, res) => {
  res.send(authLayout('Create User', `
    <h1>Create User</h1>
    <form id="create-user-form">
      <div class="form-group"><label for="cu-name">Full Name</label><input type="text" id="cu-name" name="fullName" /></div>
      <div class="form-group"><label for="cu-email">Email</label><input type="email" id="cu-email" name="email" /></div>
      <div class="form-group"><label for="cu-role">Role</label><select id="cu-role" name="role"><option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Admin</option></select></div>
      <button type="submit">Create</button>
      <p id="cu-msg" style="display:none;color:green;">User created successfully</p>
    </form>
    <script>
      document.getElementById('create-user-form').addEventListener('submit', function(e) {
        e.preventDefault();
        document.getElementById('cu-msg').style.display = 'block';
      });
    </script>
    <div class="card"><p>Or upload a CSV file for bulk import</p></div>
  `));
});

app.get('/admin/settings', (req, res) => {
  res.send(authLayout('Admin Settings', `
    <h1>Settings &amp; Configuration</h1>
    <div class="card"><a href="/admin/settings/branding">Branding</a></div>
    <div class="card"><a href="/admin/settings/features">Feature Flags</a></div>
    <div class="card"><a href="/admin/settings/languages">Languages</a></div>
    <div class="card"><a href="/admin/settings/consent">Consent Notices</a></div>
  `));
});

app.get('/admin/settings/branding', (req, res) => {
  res.send(authLayout('Branding', `
    <h1>Branding Settings</h1>
    <form id="branding-form">
      <div class="form-group"><label for="inst-name">Institution Name</label><input type="text" id="inst-name" value="Test School District" /></div>
      <button type="submit">Save</button>
      <p id="brand-msg" style="display:none;color:green;">Branding updated successfully</p>
    </form>
    <script>
      document.getElementById('branding-form').addEventListener('submit', function(e) {
        e.preventDefault();
        document.getElementById('brand-msg').style.display = 'block';
      });
    </script>
  `));
});

app.get('/admin/settings/features', (req, res) => {
  res.send(authLayout('Feature Flags', `
    <h1>Feature Flags</h1>
    <div class="card"><p>AI Tutor</p><input type="checkbox" checked /></div>
    <div class="card"><p>DigiLocker Integration</p><input type="checkbox" checked /></div>
    <div class="card"><p>Offline Mode</p><input type="checkbox" checked /></div>
  `));
});

app.get('/admin/settings/languages', (req, res) => {
  res.send(authLayout('Languages', `<h1>Language Settings</h1><p>Configured Languages: English, Hindi</p>`));
});

app.get('/admin/settings/consent', (req, res) => {
  res.send(authLayout('Consent', `<h1>Consent Notices</h1><p>Manage templates and policies.</p>`));
});
// ===== ADMIN GOVERNANCE =====
app.get('/admin/governance', (req, res) => {
  res.send(authLayout('Data Governance', `
    <h1>Data Governance &amp; Compliance</h1>
    <div class="card"><a href="/admin/governance/dsar">DSAR Requests</a></div>
    <div class="card"><a href="/admin/governance/consent">Consent Analytics</a></div>
    <div class="card"><a href="/admin/governance/audit">Audit Logs</a></div>
  `));
});

app.get('/admin/governance/dsar', (req, res) => {
  res.send(authLayout('DSAR', `<h1>Data Subject Access Requests (DSAR)</h1><p>3 pending</p>`));
});

app.get('/admin/governance/consent', (req, res) => {
  res.send(authLayout('Consent Analytics', `<h1>Consent Rate and Opt-in Analytics</h1>`));
});

app.get('/admin/governance/audit', (req, res) => {
  res.send(authLayout('Audit Log', `<h1>Audit Log</h1><table aria-label="Entries"><caption>Log Entries</caption><thead><tr><th>Action</th><th>User</th><th>Time</th></tr></thead><tbody><tr><td>Login</td><td>admin@test.com</td><td>2024-01-15</td></tr></tbody></table>`));
});

// ===== CONTENT CREATION =====
app.get('/content/create', (req, res) => {
  res.send(authLayout('Create Content', `
    <h1>Create Content</h1>
    <form id="content-form">
      <div class="form-group"><label for="cc-subject">Subject</label><select id="cc-subject" name="subject"><option value="Mathematics">Mathematics</option><option value="Science">Science</option></select></div>
      <div class="form-group"><label for="cc-topic">Topic</label><select id="cc-topic" name="topic"><option value="Quadratic Equations">Quadratic Equations</option><option value="Linear Algebra">Linear Algebra</option></select></div>
      <div class="form-group"><label for="cc-type">Type</label><select id="cc-type" name="type"><option value="lesson">Lesson</option><option value="quiz">Quiz</option></select></div>
      <div class="form-group"><label for="cc-difficulty">Difficulty</label><select id="cc-difficulty" name="difficulty"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
      <button type="submit">Generate</button>
      <button type="button" id="preview-btn">Preview</button>
    </form>
    <div data-testid="generated-content" id="gen-content" style="display:none;">
      <h2>Generated Lesson Content</h2>
      <p>Quadratic equations are polynomial equations of degree 2...</p>
      <textarea data-testid="content-editor" style="width:100%;min-height:200px;">Generated lesson content here...</textarea>
      <button onclick="document.getElementById('save-content-msg').style.display='block'">Save</button>
      <p id="save-content-msg" style="display:none;color:green;">Content saved successfully</p>
    </div>
    <div data-testid="generated-questions" id="gen-questions" style="display:none;">
      <h2>Generated Quiz Questions</h2>
      <p>Q1: Solve x^2 - 5x + 6 = 0</p>
      <p>Q2: Find the discriminant of 2x^2 + 3x - 5 = 0</p>
    </div>
    <div data-testid="content-preview" id="content-preview" style="display:none;">
      <h2>Content Preview</h2>
      <p>Preview of the generated content appears here.</p>
    </div>
    <script>
      document.getElementById('content-form').addEventListener('submit', function(e) {
        e.preventDefault();
        var type = document.getElementById('cc-type').value;
        if (type === 'quiz') {
          document.getElementById('gen-questions').style.display = 'block';
        } else {
          document.getElementById('gen-content').style.display = 'block';
        }
      });
      document.getElementById('preview-btn').addEventListener('click', function() {
        document.getElementById('content-preview').style.display = 'block';
      });
    </script>
  `));
});

// ===== COMMUNICATION =====
app.get('/communication', (req, res) => {
  res.send(authLayout('Communication', `
    <h1>Communication</h1>
    <button id="compose-btn">New Announcement</button>
    <div id="compose-form" style="display:none;">
      <div class="form-group"><label for="comm-class">Class</label><select id="comm-class"><option value="10-A">10-A</option><option value="10-B">10-B</option></select></div>
      <div class="form-group"><label for="comm-message">Message</label><textarea id="comm-message" style="width:100%;min-height:100px;"></textarea></div>
      <button type="button" id="send-btn">Send</button>
      <p id="sent-msg" style="display:none;color:green;">Announcement published successfully</p>
    </div>
    <script>
      document.getElementById('compose-btn').addEventListener('click', function() {
        document.getElementById('compose-form').style.display = 'block';
      });
      document.getElementById('send-btn').addEventListener('click', function() {
        document.getElementById('sent-msg').style.display = 'block';
      });
    </script>
  `));
});

// ===== API ENDPOINTS =====
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const validUsers = {
    'student@test-district.platform.gov.in': { password: 'Test@Student123', fullName: 'Aarav Sharma', role: 'student' },
    'teacher@test-district.platform.gov.in': { password: 'Test@Teacher123', fullName: 'Priya Patel', role: 'teacher' },
    'admin@test-district.platform.gov.in': { password: 'Test@Admin123', fullName: 'Rajesh Kumar', role: 'admin' },
  };
  const user = validUsers[email];
  if (user && user.password === password) {
    res.json({ accessToken: 'mock-token', refreshToken: 'mock-refresh', user: { email, fullName: user.fullName, role: user.role } });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/auth/register', (req, res) => {
  res.json({ message: 'Registration successful', verificationRequired: true });
});

app.get('/api/dpi/digilocker/authorize', (req, res) => {
  res.json({ authUrl: 'https://digilocker.gov.in/authorize?client_id=test' });
});

app.get('/api/dpi/abc/account/:id', (req, res) => {
  res.json({ id: req.params.id, credits: 42, institution: 'Test University' });
});

// ===== CATCH-ALL for remaining routes =====
app.get('*', (req, res) => {
  res.send(authLayout('Page', `<h1>Page</h1><p>Content for ${req.path}</p>`));
});

// Start server
app.listen(PORT, () => {
  console.log('Mock server running on http://localhost:' + PORT);
});
