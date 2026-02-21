const STORAGE_KEY = 'ipt_demo_v1';

// Initialize the global DB object
window.db = {
    accounts: [],
    departments: [],
    employees: [],
    requests: []
};
// DATABASE INIT
window.db = {
    accounts: JSON.parse(localStorage.getItem('users')) || [defaultAdmin]
};

// SAVE DATA AT ONCE
function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

// Function to Load or Seed data
function loadFromStorage() {
    const data = localStorage.getItem(STORAGE_KEY);
    
    try {
        if (data) {
            window.db = JSON.parse(data);
        } else {
            // Seed with Default Data if missing
            window.db.accounts = [{ 
                firstName: 'Admin', 
                lastName: 'User', 
                email: 'admin@example.com', 
                password: 'Password123!', 
                role: 'admin', 
                isVerified: true 
            }];
            window.db.departments = [
                { name: 'Engineering', description: 'Software team' },
                { name: 'HR', description: 'Human Resources' }
            ];
            window.db.employees = [];
            window.db.requests = [];
            
            saveToStorage(); // Save the seed data immediately
        }
    } catch (e) {
        console.error("Storage corrupt, resetting data.");
        localStorage.removeItem(STORAGE_KEY);
        loadFromStorage(); // Restart with seed data
    }
}
// --- DEFAULT DATA ---
const defaultAdmin = {
    firstName: 'Admin', lastName: 'User', email: 'admin@example.com', password: 'Password123!', role: 'admin', isVerified: true
};
const defaultDepartments = [
    { name: 'Engineering', description: 'Software team' }, { name: 'HR', description: 'Human Resources' }
];

// --- DATABASE INITIALIZATION ---
window.db = {
    accounts: JSON.parse(localStorage.getItem('users')) || [defaultAdmin]
};

function saveDB() {
    localStorage.setItem('users', JSON.stringify(window.db.accounts));
}

// --- GLOBAL STATE ---
// Restores user session if the page is refreshed
let currentUser = JSON.parse(sessionStorage.getItem('session_user')) || null; 
let currentVerifyingEmail = ''; 
let editingEmployeeIndex = -1; 
let editingDeptIndex = -1; 
let editingAccountIndex = -1; 

// --- UX HELPERS ---

function showToast(message, type = 'primary') {
    // Create toast container if it doesn't exist
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
    }

    const id = 'toast-' + Date.now();
    const toastHTML = `
        <div id="${id}" class="toast align-items-center text-white bg-${type} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>`;

    container.insertAdjacentHTML('beforeend', toastHTML);
    const toastElement = document.getElementById(id);
    const bsToast = new bootstrap.Toast(toastElement);
    bsToast.show();

    // Remove from DOM after it's hidden to keep it clean
    toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
}

// --- AUTH STATE MANAGEMENT ---

function setAuthState(isAuth, user = null) {
    // 1. Update global variable and session persistence
    if (isAuth && user) {
        currentUser = { 
            username: user.username || `${user.firstName} ${user.lastName}`, 
            role: user.role, 
            email: user.email 
        };
        sessionStorage.setItem('session_user', JSON.stringify(currentUser));
        
        // 2. Visual State: Logged In
        document.body.classList.remove('not-authenticated');
        document.body.classList.add('authenticated');

        // 3. Visual State: Admin Check
        if (user.role === 'admin') {
            document.body.classList.add('is-admin');
        } else {
            document.body.classList.remove('is-admin');
        }
        
    } else {
        // 4. Clear State & Token
        currentUser = null;
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('session_user');

        // 5. Visual State: Logged Out
        document.body.classList.remove('authenticated', 'is-admin');
        document.body.classList.add('not-authenticated');
    }

    // 6. Refresh Routing to ensure pages show/hide immediately
    handleRouting();
}

// --- ROUTE PRIVILEGES ---
const protectedRoutes = ['#/profile', '#/requests'];
const adminRoutes = ['#/employees', '#/accounts', '#/departments'];

// --- DOM ELEMENTS ---
const displayUsername = document.getElementById('display-username');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const employeesTableBody = document.getElementById('employees-table-body');
const addEmployeeFormContainer = document.getElementById('add-employee-form-container');
const employeeForm = document.getElementById('employee-form');
const departmentsTableBody = document.getElementById('departments-table-body');
const addDeptFormContainer = document.getElementById('add-dept-form-container');
const deptForm = document.getElementById('dept-form');
const accountsTableBody = document.getElementById('accounts-table-body');
const addAccountFormContainer = document.getElementById('add-account-form-container');
const accountForm = document.getElementById('account-form');
const requestsContent = document.getElementById('requests-content');
const requestForm = document.getElementById('request-form');
const reqItemsContainer = document.getElementById('req-items-container');
const newRequestModal = document.getElementById('newRequestModal');

// --- ROUTING LOGIC ---

function navigateTo(hash) {
    window.location.hash = hash;
}

function handleRouting() {
    const hash = window.location.hash || '#/';
    const isAuth = currentUser !== null;
    const isAdmin = isAuth && currentUser.role === 'admin';

    // 1. Sync UI state with Auth status
    if (isAuth) {
        document.body.className = 'authenticated' + (isAdmin ? ' is-admin' : '');
        
        // FIX: Check if username exists, otherwise fallback to the name in the session object
        if (displayUsername) {
            displayUsername.textContent = currentUser.username || "User";
        }
    } else {
        document.body.className = 'not-authenticated';
    }

    // 2. Route Guarding
    if (protectedRoutes.includes(hash) && !isAuth) {
        alert("Please login to access this page.");
        return navigateTo('#/login');
    }
    if (adminRoutes.includes(hash) && !isAdmin) {
        showToast("Access Denied: Admins Only", "danger");
        return navigateTo('#/');
    }

    // 3. View Management
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));

    let pageId = 'home-section'; 
    if (hash === '#/register') pageId = 'register-section';
    if (hash === '#/login') pageId = 'login-section';
    if (hash === '#/verify-email') pageId = 'verify-section';
    if (hash === '#/profile') pageId = 'profile-section';
    if (hash === '#/employees') pageId = 'employees-section';
    if (hash === '#/accounts') pageId = 'accounts-section';
    if (hash === '#/departments') pageId = 'departments-section';
    if (hash === '#/requests') pageId = 'requests-section';

    const activePage = document.getElementById(pageId);
    if (activePage) {
        activePage.classList.add('active');

        // --- UPDATED RENDER TRIGGERS ---
        if (pageId === 'verify-section') renderVerifyPage();
        if (pageId === 'profile-section') renderProfile();
        
        // This is the specific change for Phase 6 Part C:
        if (pageId === 'employees-section') {
            renderDeptDropdown(); 
            renderEmployeesTable();
        }

        if (pageId === 'accounts-section') renderAccounts();
        if (pageId === 'departments-section') renderDepartments();
        if (pageId === 'requests-section') renderRequests();
    }
}

// --- RENDERING HELPERS ---

function renderProfile() {
    // 1. Safety check: If no one is logged in, don't try to render
    if (!currentUser) return;

    // 2. Select the HTML elements (matching the IDs in your index.html)
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const profileRole = document.getElementById('profile-role');

    // 3. Update the UI with data from the global currentUser object
    if (profileName) profileName.textContent = currentUser.username;
    if (profileEmail) profileEmail.textContent = currentUser.email;
    if (profileRole) profileRole.textContent = currentUser.role;
}

function handleEditProfileAlert() {
    alert(`Editing profile for ${currentUser.username} will be implemented in the next update!`);
}

function renderVerifyPage() {
    const email = localStorage.getItem('unverified_email');
    const display = document.getElementById('verify-email-display');
    
    if (email && display) {
        display.textContent = email;
    } else if (!email) {
        // If someone types #/verify-email manually without registering
        alert("Access denied. No pending verification.");
        navigateTo('#/register');
    }
}

// --- AUTH LOGIC ---

function handleRegister(e) {
    e.preventDefault(); 
    const firstName = document.getElementById('reg-firstname').value.trim();
    const lastName = document.getElementById('reg-lastname').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    if (password.length < 6) return alert("Password must be at least 6 characters.");
    if (window.db.accounts.some(acc => acc.email === email)) return alert('Email already exists!');

    window.db.accounts.push({ firstName, lastName, email, password, role: 'user', isVerified: false });
    saveDB();

    localStorage.setItem('unverified_email', email);
    registerForm.reset();
    navigateTo('#/verify-email');
}

function handleSimulateVerification() {
    // 1. Retrieve the email we stored during registration
    const emailToVerify = localStorage.getItem('unverified_email');
    
    if (!emailToVerify) {
        alert("No pending verification found. Please register first.");
        return navigateTo('#/register');
    }

    // 2. Find the index of the account in your window.db
    const userIndex = window.db.accounts.findIndex(u => u.email === emailToVerify);

    if (userIndex !== -1) {
        // 3. Update the state: Set verified to true
        window.db.accounts[userIndex].isVerified = true;
        
        // 4. Persistence: Save the updated array back to localStorage
        saveDB();

        // 5. Cleanup: Remove the temporary unverified tracking email
        localStorage.removeItem('unverified_email');

        alert('✅ Email successfully verified! You can now log in.');
        
        // 6. Navigate: Move to the login page
        navigateTo('#/login');
    } else {
        alert('Error: Account not found in database.');
    }
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const user = window.db.accounts.find(u => 
        u.email === email && u.password === password && u.isVerified === true
    );

    if (user) {
        localStorage.setItem('auth_token', user.email);
        setAuthState(true, user); // This does the redirect and UI update for you!
        navigateTo('#/profile');
    } else {
        showToast("Invalid credentials. Please try again.", "danger");
    }
}

// Update your Logout function to look like this:
function handleLogout(e) {
    // 1. Prevent default link behavior if triggered by an <a> tag
    if (e) e.preventDefault();

    // 2. Requirement: Clear auth_token from localStorage
    localStorage.removeItem('auth_token');

    // 3. Requirement: Call setAuthState(false)
    // This will clear currentUser, sessionStorage, and reset body classes
    setAuthState(false);

    // 4. Requirement: Navigate to home
    navigateTo('#/');
}

// --- CRUD LOGIC ---

function toggleEmployeeForm(show) {
    addEmployeeFormContainer.classList.toggle('d-none', !show);
    if(!show) { employeeForm.reset(); editingEmployeeIndex = -1; }
}

function renderEmployees() {
    // Phase 4: Pull from the global database object instead of separate localStorage keys
    const employees = window.db.employees || [];
    
    // Clear the table and handle empty state
    employeesTableBody.innerHTML = employees.length === 0 
        ? `<tr><td colspan="5" class="text-center py-2 bg-light text-dark">No employees.</td></tr>` 
        : ''; 

    // Render each row from window.db.employees
    employees.forEach((emp, index) => {
        employeesTableBody.innerHTML += `
            <tr>
                <td class="text-start ps-3 fw-medium">${emp.id}</td>
                <td class="text-start">${emp.name}</td>
                <td>${emp.position}</td>
                <td>${emp.department}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary py-0" onclick="editEmployee(${index})">Edit</button>
                    <button class="btn btn-sm btn-outline-danger py-0" onclick="deleteEmployee(${index})">Delete</button>
                </td>
            </tr>`;
    });
}

// FUNCTION PARA RENDER DROPDOWN DEPT
function renderDeptDropdown() {
    const deptSelect = document.getElementById('emp-dept');
    if (!deptSelect) return;

    const depts = window.db.departments || [];
    
    // This maps your window.db.departments array into HTML options
    deptSelect.innerHTML = depts.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
}

function handleSaveEmployee(e) {
    e.preventDefault();
    const email = document.getElementById('emp-email').value.trim();
    const matchedUser = window.db.accounts.find(u => u.email === email);
    const name = matchedUser ? `${matchedUser.firstName} ${matchedUser.lastName}` : 'Unregistered User';

    let employees = JSON.parse(localStorage.getItem('employees')) || [];
    const empData = { 
        id: document.getElementById('emp-id').value, 
        email, name, 
        position: document.getElementById('emp-position').value, 
        department: document.getElementById('emp-dept').value, 
        hireDate: document.getElementById('emp-hiredate').value 
    };

    if (editingEmployeeIndex > -1) employees[editingEmployeeIndex] = empData;
    else employees.push(empData);
    
    localStorage.setItem('employees', JSON.stringify(employees));
    toggleEmployeeForm(false);
    renderEmployees();

    showToast("Employee record updated successfully!", "success");
}

window.editEmployee = function(index) {
    const employees = JSON.parse(localStorage.getItem('employees'));
    const emp = employees[index];
    document.getElementById('emp-id').value = emp.id;
    document.getElementById('emp-email').value = emp.email;
    document.getElementById('emp-position').value = emp.position;
    document.getElementById('emp-dept').value = emp.department;
    document.getElementById('emp-hiredate').value = emp.hireDate;
    editingEmployeeIndex = index;
    toggleEmployeeForm(true);
};

window.deleteEmployee = function(index) {
    if (confirm('Delete?')) {
        let employees = JSON.parse(localStorage.getItem('employees'));
        employees.splice(index, 1);
        localStorage.setItem('employees', JSON.stringify(employees));
        renderEmployees();
    }
};

function toggleDeptForm(show) {
    addDeptFormContainer.classList.toggle('d-none', !show);
    if(!show) { deptForm.reset(); editingDeptIndex = -1; }
}

// --- DEPARTMENTS MANAGEMENT (Phase 6) ---

function renderDepartments() {
    // Phase 6 Requirement: Render list from window.db.departments
    const depts = window.db.departments || [];
    
    // Select the table body from your HTML
    departmentsTableBody.innerHTML = depts.length === 0 
        ? `<tr><td colspan="3" class="text-center py-2 bg-light">No departments found.</td></tr>` 
        : '';

    depts.forEach((dept, index) => {
        departmentsTableBody.innerHTML += `
            <tr>
                <td class="text-start ps-3 fw-medium">${dept.name}</td>
                <td class="text-start">${dept.description}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary" onclick="handleAddDeptAlert()">Edit</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="handleAddDeptAlert()">Delete</button>
                    </div>
                </td>
            </tr>`;
    });
}

// --- EMPLOYEES MANAGEMENT (Phase 6) ---

function renderEmployeesTable() {
    const employees = window.db.employees || [];
    employeesTableBody.innerHTML = employees.length === 0 
        ? `<tr><td colspan="5" class="text-center py-2 bg-light">No employees found.</td></tr>` 
        : '';

    employees.forEach((emp, index) => {
        employeesTableBody.innerHTML += `
            <tr>
                <td class="text-start ps-3 fw-medium">${emp.id}</td>
                <td class="text-start">${emp.email}</td>
                <td>${emp.position}</td>
                <td><span class="badge bg-secondary">${emp.department}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-danger py-0" onclick="deleteEmployee(${index})">Delete</button>
                </td>
            </tr>`;
    });
}

// Phase 6 Requirement: Populate Department dropdown from window.db.departments
function renderDeptDropdown() {
    const deptSelect = document.getElementById('emp-dept');
    const depts = window.db.departments || [];
    
    // Keep only the first 'Select' option if it exists, or clear all
    deptSelect.innerHTML = depts.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
}

function handleSaveEmployee(e) {
    e.preventDefault();
    
    const email = document.getElementById('emp-email').value.trim();
    
    // Requirement: Check if user email exists in accounts
    const accountExists = window.db.accounts.some(acc => acc.email === email);
    
    if (!accountExists) {
        return alert(`Error: No account found for ${email}. Please create the account first.`);
    }

    const empData = { 
        id: document.getElementById('emp-id').value.trim(), 
        email: email,
        position: document.getElementById('emp-position').value.trim(), 
        department: document.getElementById('emp-dept').value, 
        hireDate: document.getElementById('emp-hiredate').value 
    };

    if (editingEmployeeIndex > -1) {
        window.db.employees[editingEmployeeIndex] = empData;
    } else {
        window.db.employees.push(empData);
    }
    
    saveToStorage();
    toggleEmployeeForm(false);
    renderEmployeesTable();
    showToast("Employee record updated successfully!", "success");
}


// Phase 6 Requirement: Alert "Not implemented"
function handleAddDeptAlert() {
    alert("Department modification is not implemented for this version.");
}

function handleSaveDept(e) {
    e.preventDefault();
    
    // 1. Get values from the form
    const name = document.getElementById('dept-name').value.trim();
    const description = document.getElementById('dept-desc').value.trim();
    const data = { name, description };

    // 2. Save to our central window.db object
    if (editingDeptIndex > -1) {
        window.db.departments[editingDeptIndex] = data;
    } else {
        window.db.departments.push(data);
    }

    // 3. Save to the main localStorage key (ipt_demo_v1)
    saveToStorage(); 
    
    // 4. Update the UI
    toggleDeptForm(false);
    renderDepartments();
    showToast("Department saved successfully!", "success");
}

window.editDept = function(index) {
    let depts = JSON.parse(localStorage.getItem('departments'));
    document.getElementById('dept-name').value = depts[index].name;
    document.getElementById('dept-desc').value = depts[index].description;
    editingDeptIndex = index; toggleDeptForm(true);
};

window.deleteDept = function(index) {
    if (confirm('Delete?')) {
        let depts = JSON.parse(localStorage.getItem('departments'));
        depts.splice(index, 1); localStorage.setItem('departments', JSON.stringify(depts)); renderDepartments();
    }
};

function toggleAccountForm(show) {
    addAccountFormContainer.classList.toggle('d-none', !show);
    if (!show) {
        accountForm.reset();
        editingAccountIndex = -1;
    }
}

// --- ACCOUNTS MANAGEMENT (Phase 6) ---

function renderAccounts() {
    const accounts = window.db.accounts || [];
    accountsTableBody.innerHTML = ''; 

    accounts.forEach((user, index) => {
        const verifiedStatus = user.isVerified ? '<span class="text-success">✅</span>' : '<span class="text-muted">❌</span>';
        
        accountsTableBody.innerHTML += `
            <tr>
                <td class="ps-3">${user.firstName} ${user.lastName}</td>
                <td>${user.email}</td>
                <td class="text-capitalize"><span class="badge bg-info text-dark">${user.role}</span></td>
                <td>${verifiedStatus}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary" onclick="editAccount(${index})">Edit</button>
                        <button class="btn btn-sm btn-outline-warning" onclick="resetPassword(${index})">PW</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteAccount(${index})">Delete</button>
                    </div>
                </td>
            </tr>`;
    });
}

function renderAccounts() {
    const accounts = window.db.accounts || [];
    accountsTableBody.innerHTML = ''; 

    accounts.forEach((user, index) => {
        const verifiedStatus = user.isVerified ? '<span class="text-success">✅</span>' : '<span class="text-muted">❌</span>';
        
        accountsTableBody.innerHTML += `
            <tr>
                <td class="ps-3">${user.firstName} ${user.lastName}</td>
                <td>${user.email}</td>
                <td class="text-capitalize"><span class="badge bg-info text-dark">${user.role}</span></td>
                <td>${verifiedStatus}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary" onclick="editAccount(${index})">Edit</button>
                        <button class="btn btn-sm btn-outline-warning" onclick="resetPassword(${index})">PW</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteAccount(${index})">Delete</button>
                    </div>
                </td>
            </tr>`;
    });
}

// Requirement: Prompt for new password (min 6 chars)
window.resetPassword = function(index) {
    const user = window.db.accounts[index];
    const newPassword = prompt(`Enter new password for ${user.email} (min 6 chars):`);
    
    if (newPassword === null) return; 

    if (newPassword.length < 6) {
        alert("Password too short! Change rejected.");
    } else {
        window.db.accounts[index].password = newPassword;
        saveToStorage();
        alert("Password updated successfully.");
    }
};

// Requirement: Confirm + Prevent self-deletion
window.deleteAccount = function(index) {
    const targetUser = window.db.accounts[index];

    if (currentUser && targetUser.email === currentUser.email) {
        return alert("Error: You cannot delete your own account while logged in!");
    }

    if (confirm(`Are you sure you want to delete ${targetUser.firstName}'s account?`)) {
        window.db.accounts.splice(index, 1);
        saveToStorage();
        renderAccounts();
    }
};

// Requirement: Prompt for new password (min 6 chars)
window.resetPassword = function(index) {
    const user = window.db.accounts[index];
    const newPassword = prompt(`Enter new password for ${user.email} (min 6 chars):`);
    
    if (newPassword === null) return; 

    if (newPassword.length < 6) {
        alert("Password too short! Change rejected.");
    } else {
        window.db.accounts[index].password = newPassword;
        saveToStorage();
        alert("Password updated successfully.");
    }
};

// Requirement: Confirm + Prevent self-deletion
window.deleteAccount = function(index) {
    const targetUser = window.db.accounts[index];

    if (currentUser && targetUser.email === currentUser.email) {
        return alert("Error: You cannot delete your own account while logged in!");
    }

    if (confirm(`Are you sure you want to delete ${targetUser.firstName}'s account?`)) {
        window.db.accounts.splice(index, 1);
        saveToStorage();
        renderAccounts();
    }
};

function handleSaveAccount(e) {
    e.preventDefault();
    const data = { 
        firstName: document.getElementById('acc-firstname').value, 
        lastName: document.getElementById('acc-lastname').value,
        email: document.getElementById('acc-email').value,
        password: document.getElementById('acc-password').value,
        role: document.getElementById('acc-role').value.toLowerCase(),
        isVerified: document.getElementById('acc-verified').checked
    };
    if (editingAccountIndex > -1) window.db.accounts[editingAccountIndex] = data; else window.db.accounts.push(data);
    saveDB(); toggleAccountForm(false); renderAccounts();
}

window.editAccount = function(index) {
    const acc = window.db.accounts[index];
    document.getElementById('acc-firstname').value = acc.firstName;
    document.getElementById('acc-lastname').value = acc.lastName;
    document.getElementById('acc-email').value = acc.email;
    document.getElementById('acc-password').value = acc.password;
    document.getElementById('acc-role').value = acc.role;
    document.getElementById('acc-verified').checked = acc.isVerified;
    editingAccountIndex = index; toggleAccountForm(true);
};

window.deleteAccount = function(index) {
    if (confirm('Delete?')) { window.db.accounts.splice(index, 1); saveDB(); renderAccounts(); }
};

window.deleteEmployee = function(index) {
    if (confirm("Remove this employee record?")) {
        window.db.employees.splice(index, 1);
        saveToStorage();
        renderEmployeesTable();
    }
};

// --- REQUESTS LOGIC ---

// --- REQUESTS LOGIC (Phase 7) ---

function renderRequests() {
    const allRequests = window.db.requests || [];
    // Requirement: Show only requests belonging to the logged-in user
    const myRequests = allRequests.filter(req => req.employeeEmail === currentUser.email);
    
    requestsContent.innerHTML = myRequests.length === 0 
        ? `<p class="text-secondary text-center py-3">No requests found.</p>` 
        : '';

    let tableHTML = `
        <table class="table table-hover align-middle">
            <thead class="table-light">
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Items</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>`;

    myRequests.forEach(req => {
        const statusClass = req.status === 'Approved' ? 'success' : req.status === 'Rejected' ? 'danger' : 'warning';
        const itemCount = req.items.reduce((sum, item) => sum + parseInt(item.qty), 0);
        
        tableHTML += `
            <tr>
                <td>${new Date(req.date).toLocaleDateString()}</td>
                <td class="fw-medium">${req.type}</td>
                <td><span class="badge rounded-pill bg-light text-dark border">${itemCount} items</span></td>
                <td><span class="badge bg-${statusClass}">${req.status}</span></td>
            </tr>`;
    });

    if (myRequests.length > 0) {
        requestsContent.innerHTML = tableHTML + `</tbody></table>`;
    }
}

window.addRequestItemRow = function(isFirst = false) {
    const row = document.createElement('div');
    row.className = 'd-flex gap-2 mb-2 req-item-row';
    
    // Requirement: "+" for first row, "×" for subsequent rows
    const btn = isFirst 
        ? `<button type="button" class="btn btn-outline-primary btn-sm" onclick="addRequestItemRow()">+</button>` 
        : `<button type="button" class="btn btn-outline-danger btn-sm" onclick="this.parentElement.remove()">×</button>`;
    
    row.innerHTML = `
        <input type="text" class="form-control form-control-sm req-item-name" placeholder="Item Name" required>
        <input type="number" class="form-control form-control-sm req-item-qty" value="1" min="1" style="width: 80px;" required>
        ${btn}`;
    
    reqItemsContainer.appendChild(row);
};

function handleSaveRequest(e) {
    e.preventDefault();
    
    const rows = document.querySelectorAll('.req-item-row');
    let items = [];

    // Requirement: Extract data from dynamic rows
    rows.forEach(row => {
        const name = row.querySelector('.req-item-name').value.trim();
        const qty = row.querySelector('.req-item-qty').value;
        if (name) items.push({ name, qty });
    });
    
function validateForm(formId) {
    const form = document.getElementById(formId);
    let isValid = true;
    
    form.querySelectorAll('input[required], select[required]').forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('is-invalid');
            isValid = false;
        } else {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
        }
    });
    return isValid;
}
    // Requirement: Validate at least one item
    if (items.length === 0) return alert("Please add at least one item to your request.");

    const newRequest = {
        employeeEmail: currentUser.email,
        type: document.getElementById('req-type').value,
        items: items,
        status: "Pending",
        date: new Date().toISOString()
    };

    window.db.requests.push(newRequest);
    saveToStorage();
    
    // Close Bootstrap Modal
    const modalInstance = bootstrap.Modal.getInstance(document.getElementById('newRequestModal'));
    if (modalInstance) modalInstance.hide();
    
    renderRequests();
}

// --- INITIALIZATION ---

function initializeApp() {
    // 1. Requirement: Load the central database object
    loadFromStorage();

    // 2. Requirement: Restore session persistence
    const savedUser = sessionStorage.getItem('session_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        setAuthState(true, currentUser);
    } else {
        setAuthState(false);
    }

    // 3. CRITICAL: Run the router to display the correct section
    handleRouting();
}

// --- GLOBAL LISTENERS ---

window.addEventListener('hashchange', handleRouting);

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    if (!window.location.hash) navigateTo('#/'); else handleRouting();
});

// Event Bindings
loginForm.addEventListener('submit', handleLogin);
registerForm.addEventListener('submit', handleRegister);
document.getElementById('simulate-verify-btn').addEventListener('click', handleSimulateVerification);
document.getElementById('logout-btn').addEventListener('click', handleLogout);
employeeForm.addEventListener('submit', handleSaveEmployee);
deptForm.addEventListener('submit', handleSaveDept);
accountForm.addEventListener('submit', handleSaveAccount);
requestForm.addEventListener('submit', handleSaveRequest);

// UI Toggle Buttons
document.getElementById('show-add-employee-btn').addEventListener('click', () => toggleEmployeeForm(true));
document.getElementById('cancel-employee-btn').addEventListener('click', () => toggleEmployeeForm(false));
document.getElementById('show-add-dept-btn').addEventListener('click', () => toggleDeptForm(true));
document.getElementById('cancel-dept-btn').addEventListener('click', () => toggleDeptForm(false));
document.getElementById('show-add-account-btn').addEventListener('click', () => toggleAccountForm(true));
document.getElementById('cancel-account-btn').addEventListener('click', () => toggleAccountForm(false));

// Global Navigation Actions
document.querySelectorAll('#get-started-btn, #go-to-login-btn').forEach(btn => {
    btn.addEventListener('click', () => navigateTo('#/login'));
});
document.querySelectorAll('#cancel-register-btn, #cancel-login-btn').forEach(btn => {
    btn.addEventListener('click', () => navigateTo('#/'));
});

// Modal Setup
if(newRequestModal) {
    newRequestModal.addEventListener('show.bs.modal', () => {
        requestForm.reset();
        reqItemsContainer.innerHTML = ''; 
        addRequestItemRow(true); // Start with one fresh row
    });
}

// Navigation Buttons
document.getElementById('get-started-btn').addEventListener('click', () => navigateTo('#/login'));
document.getElementById('go-to-login-btn').addEventListener('click', () => navigateTo('#/login'));
document.getElementById('cancel-register-btn').addEventListener('click', () => navigateTo('#/'));
document.getElementById('cancel-login-btn').addEventListener('click', () => navigateTo('#/'));

document.getElementById('logout-btn').addEventListener('click', handleLogout);