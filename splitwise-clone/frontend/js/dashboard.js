const token = localStorage.getItem("token");
if (!token) {
    window.location.href = "index.html";
}

const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
};

let selectedGroupId = null;
let selectedGroupName = null;
let currentUser = null;
let allGroups = [];
let currentExpenses = [];

document.addEventListener('DOMContentLoaded', async function() {
    await loadCurrentUser();
    await refreshDashboard();
    setupEventListeners();
    setupModals();
    loadRecentActivity();
});

window.addEventListener('focus', function() {
    setTimeout(() => {
        loadCurrentUser();
    }, 500);
});

async function loadCurrentUser() {
    try {
        const stored = localStorage.getItem("user");
        if (stored) {
            currentUser = JSON.parse(stored);
            updateDashboardProfilePicture();
        } else {
            await fetchCurrentUserFromServer();
        }
    } catch (err) {
        console.error("Error loading user:", err);
        await fetchCurrentUserFromServer();
    }
}

async function fetchCurrentUserFromServer() {
    try {
        const data = await api.profile.getPassport();
        currentUser = data.user;
        localStorage.setItem("user", JSON.stringify(currentUser));
        updateDashboardProfilePicture();
    } catch (err) {
        console.error("Error fetching user from server:", err);
    }
}

function updateDashboardProfilePicture() {
    const profilePic = document.getElementById('dashboardProfilePic');
    const defaultIcon = document.getElementById('defaultProfileIcon');
    
    if (profilePic && currentUser) {
        if (currentUser.profileImage) {
            profilePic.src = `http://localhost:5000${currentUser.profileImage}`;
            profilePic.style.display = 'block';
            if (defaultIcon) defaultIcon.style.display = 'none';
        } else {
            profilePic.src = 'https://via.placeholder.com/44x44/667eea/ffffff?text=👤';
            profilePic.style.display = 'block';
            if (defaultIcon) defaultIcon.style.display = 'none';
        }
        
        profilePic.onerror = function() {
            this.style.display = 'none';
            if (defaultIcon) defaultIcon.style.display = 'flex';
        };
    }
}

// Setup event listeners
function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", handleLogout);
    }

    // Profile button
    const profileBtn = document.querySelector("#profileBtn");
    if (profileBtn) {
        profileBtn.addEventListener("click", () => {
            window.location.href = "profile.html";
        });
    }

    // Create group button
    const createGroupBtn = document.getElementById("createGroupBtn");
    if (createGroupBtn) {
        createGroupBtn.addEventListener("click", handleCreateGroup);
    }

    // Add expense button
    const addExpenseBtn = document.getElementById("addExpenseBtn");
    if (addExpenseBtn) {
        addExpenseBtn.addEventListener("click", handleAddExpense);
    }

    // Quick action buttons
    const settleAllBtn = document.getElementById("settleAllBtn");
    if (settleAllBtn) {
        settleAllBtn.addEventListener("click", handleSettleAll);
    }

    const exportDataBtn = document.getElementById("exportDataBtn");
    if (exportDataBtn) {
        exportDataBtn.addEventListener("click", handleExportData);
    }

    const inviteFriendsBtn = document.getElementById("inviteFriendsBtn");
    if (inviteFriendsBtn) {
        inviteFriendsBtn.addEventListener("click", () => {
            showModal('inviteModal');
        });
    }

    // Form validation
    const descInput = document.getElementById("description");
    const amountInput = document.getElementById("amount");
    
    if (descInput && amountInput) {
        [descInput, amountInput].forEach(input => {
            input.addEventListener('input', validateExpenseForm);
        });
    }
}

// Setup modals
function setupModals() {
    // Close modal when clicking X
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });

    // Invite modal buttons
    const sendInviteBtn = document.getElementById('sendInvite');
    const cancelInviteBtn = document.getElementById('cancelInvite');
    
    if (sendInviteBtn) {
        sendInviteBtn.addEventListener('click', handleSendInvite);
    }
    
    if (cancelInviteBtn) {
        cancelInviteBtn.addEventListener('click', () => {
            hideModal('inviteModal');
        });
    }
}

// Handle logout
function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    showNotification("Logged out successfully!", "success");
    setTimeout(() => {
        window.location.href = "index.html";
    }, 1000);
}

// Refresh all dashboard data
async function refreshDashboard() {
    showLoading(true);
    try {
        await Promise.all([
            loadCurrentUser(), // This will update the profile picture
            loadGroups(),
            updateBalances()
        ]);
        
        if (selectedGroupId) {
            await loadGroupExpenses(selectedGroupId, selectedGroupName);
        }
        
        updateExpenseFormState();
    } catch (err) {
        console.error("Error refreshing dashboard:", err);
        showNotification("Failed to refresh dashboard data", "error");
    } finally {
        showLoading(false);
    }
}

// Load and display groups
async function loadGroups() {
    try {
        const res = await api.groups.getAll();
        const groups = res;
        allGroups = groups;
        const list = document.getElementById("groupList");
        const noGroupsMsg = document.getElementById("noGroupsMessage");
        
        list.innerHTML = "";
        
        if (groups.length === 0) {
            noGroupsMsg.style.display = "block";
            return;
        }
        
        noGroupsMsg.style.display = "none";
        groups.forEach(group => renderGroup(group));
        
        // Update invite modal group options
        updateInviteGroupOptions(groups);
        
    } catch (err) {
        console.error("Error loading groups:", err);
        showNotification("Failed to load groups", "error");
    }
}

// Render a single group
function renderGroup(group) {
    const list = document.getElementById("groupList");
    const li = document.createElement("li");
    li.className = "fade-in";
    li.dataset.groupId = group._id;

    const membersArray = Array.isArray(group.members) ? group.members : [];
    const displayNames = membersArray.length > 0 ? membersArray.slice(0, 3).join(", ") : "No members";
    const totalMembers = membersArray.length;
    const moreMembers = totalMembers > 3 ? ` +${totalMembers - 3} more` : "";

    li.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="color: #fff; font-size: 16px;">
                    <i class="fas fa-users" style="margin-right: 8px; color: #667eea;"></i>
                    ${escapeHtml(group.name)}
                </strong>
                <div style="display: flex; gap: 8px;">
                    <button onclick="inviteMember(event, '${group._id}')"
                        style="padding:6px 12px; font-size:11px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 15px; cursor: pointer;">
                        <i class="fas fa-user-plus"></i> Invite
                    </button>
                    <button onclick="deleteGroup(event, '${group._id}', '${escapeHtml(group.name)}')"
                        style="padding:6px 12px; font-size:11px; background: linear-gradient(135deg, #ff5252, #dd2476); color: white; border: none; border-radius: 15px; cursor: pointer;">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>

            <p style="font-size:13px; color: rgba(255,255,255,0.8); margin: 5px 0;">
                <i class="fas fa-info-circle" style="margin-right: 5px;"></i>
                ${escapeHtml(group.description || "No description")}
            </p>

            <div style="display: flex; justify-content: space-between; align-items: center;">
                <small style="color: rgba(255,255,255,0.7); font-size: 11px;">
                    <i class="fas fa-user" style="margin-right: 3px;"></i>
                    ${escapeHtml(displayNames)}${moreMembers}
                </small>
                <small style="color: #667eea; font-weight: bold; font-size: 12px;">
                    ${totalMembers} member${totalMembers !== 1 ? 's' : ''}
                </small>
            </div>
        </div>
    `;

    li.onclick = (e) => {
        if (e.target.tagName !== 'BUTTON') {
            selectGroup(group._id, group.name);
        }
    };

    list.appendChild(li);
}

// Select a group
function selectGroup(groupId, groupName) {
    selectedGroupId = groupId;
    selectedGroupName = groupName;
    
    // Visual feedback
    document.querySelectorAll('#groupList li').forEach(item => {
        item.classList.remove('selected');
    });
    
    const selectedLi = document.querySelector(`#groupList li[data-group-id="${groupId}"]`);
    if (selectedLi) {
        selectedLi.classList.add('selected');
    }
    
    // Update expense form
    updateExpenseFormState();
    
    // Load expenses for this group
    loadGroupExpenses(groupId, groupName);
}

// Update expense form state
function updateExpenseFormState() {
    const expenseForm = document.getElementById("expenseForm");
    const noGroupSelected = document.getElementById("noGroupSelected");
    const addExpenseBtn = document.getElementById("addExpenseBtn");
    const selectedGroupInfo = document.getElementById("selectedGroupInfo");
    const selectedGroupNameSpan = document.getElementById("selectedGroupName");
    
    if (selectedGroupId) {
        expenseForm.style.display = "block";
        noGroupSelected.style.display = "none";
        selectedGroupInfo.style.display = "block";
        selectedGroupNameSpan.textContent = selectedGroupName;
        validateExpenseForm();
    } else {
        expenseForm.style.display = "none";
        noGroupSelected.style.display = "block";
        addExpenseBtn.disabled = true;
    }
}

// Validate expense form
function validateExpenseForm() {
    const description = document.getElementById("description").value.trim();
    const amount = parseFloat(document.getElementById("amount").value);
    const addExpenseBtn = document.getElementById("addExpenseBtn");
    
    const isValid = selectedGroupId && description && amount > 0;
    addExpenseBtn.disabled = !isValid;
}

// Delete group
window.deleteGroup = async (e, groupId, groupName) => {
    e.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete the group "${groupName}"? This will also delete all expenses in this group and cannot be undone.`)) {
        return;
    }

    try {
        const res = await api.groups.delete(groupId);
        
        showNotification(`Group "${groupName}" deleted successfully!`, "success");
        
        // Clear selection if deleted group was selected
            if (selectedGroupId === groupId) {
                selectedGroupId = null;
                selectedGroupName = null;
                updateExpenseFormState();
                document.getElementById("expenseDetailCard").style.display = "none";
            }
            
            await refreshDashboard();
            addToActivity(`Deleted group: ${groupName}`, "group");
    } catch (err) {
        console.error("Delete group error:", err);
        showNotification("Network error. Please check your connection and try again.", "error");
    }
};

// Invite member to group
window.inviteMember = async (e, groupId) => {
    e.stopPropagation();
    
    const email = prompt("Enter friend's email:");
    if (!email || !email.trim()) return;
    
    if (!email.includes('@')) {
        showNotification("Please enter a valid email address", "error");
        return;
    }

    try {
        const data = await api.groups.addMember(groupId, email.trim());

        showNotification("Member added successfully!", "success");
        await refreshDashboard();
    } catch (err) {
        console.error("Add member error:", err);
        showNotification(err.message || "Failed to add member. Please try again.", "error");
    }
};

// Handle group creation
async function handleCreateGroup() {
    const nameInput = document.getElementById("groupName");
    const membersInput = document.getElementById("groupMembers");
    const descInput = document.getElementById("groupDesc");
    
    const name = nameInput.value.trim();
    const description = descInput.value.trim();
    const membersRaw = membersInput.value.trim();
    
    if (!name) {
        showNotification("Please enter a group name", "error");
        nameInput.focus();
        return;
    }

    if (name.length < 2) {
        showNotification("Group name must be at least 2 characters", "error");
        nameInput.focus();
        return;
    }
    
    const memberEmails = membersRaw 
        ? membersRaw.split(",").map(m => m.trim()).filter(m => m !== "") 
        : [];

    // Validate emails
    for (const email of memberEmails) {
        if (!email.includes('@')) {
            showNotification(`Invalid email: ${email}`, "error");
            membersInput.focus();
            return;
        }
    }

    const btn = document.getElementById("createGroupBtn");
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    btn.disabled = true;

    try {
        const data = await api.groups.create(name, description, memberEmails);
        
        showNotification(`Group "${name}" created with ${memberEmails.length + 1} members!`, "success");
        
        // Clear form
        nameInput.value = "";
        membersInput.value = "";
        descInput.value = "";
        
        await refreshDashboard();
    } catch (err) {
        console.error("Group creation error:", err);
        showNotification(err.message || "Failed to create group. Please try again.", "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Load expenses for a group
async function loadGroupExpenses(groupId, groupName) {
    try {
        const expenses = await api.expenses.getByGroup(groupId);
        currentExpenses = expenses;
        
        const expenseList = document.getElementById("expenseList");
        const noExpensesMsg = document.getElementById("noExpensesMessage");
        const expenseCardTitle = document.getElementById("expenseCardTitle");
        
        expenseList.innerHTML = "";
        expenseCardTitle.innerHTML = `<i class="fas fa-list"></i> ${groupName} Expenses`;
        
        if (expenses.length === 0) {
            noExpensesMsg.style.display = "block";
            expenseList.style.display = "none";
        } else {
            noExpensesMsg.style.display = "none";
            expenseList.style.display = "block";
            
            expenses.forEach(expense => {
                const li = document.createElement("li");
                li.innerHTML = renderExpenseItem(expense);
                expenseList.appendChild(li);
            });
        }
        
        // Update expense stats
        updateExpenseStats(expenses);
        
        document.getElementById("expenseDetailCard").style.display = "block";
    } catch (err) {
        console.error("Error loading expenses:", err);
        showNotification("Failed to load expenses", "error");
    }
}

// Render expense item
function renderExpenseItem(expense) {
    const splitAmount = expense.amount / (expense.splitWith?.length || 1);
    const categoryIcon = getCategoryIcon(expense.category);
    const isUserPayer = expense.paidBy?._id === currentUser?.id;
    
    return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: rgba(255,255,255,0.1); border-radius: 12px; margin: 8px 0; border-left: 4px solid ${isUserPayer ? '#00e676' : '#667eea'};">
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <i class="${categoryIcon}" style="color: #667eea; font-size: 16px;"></i>
                    <strong style="color: #fff; font-size: 16px;">${escapeHtml(expense.description)}</strong>
                    ${isUserPayer ? '<span style="background: #00e676; color: #000; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold;">YOU PAID</span>' : ''}
                </div>
                <p style="font-size: 13px; margin: 5px 0; color: rgba(255,255,255,0.8);">
                    <i class="fas fa-user" style="margin-right: 5px;"></i>
                    Paid by: <span style="color: #667eea; font-weight: 500;">${escapeHtml(expense.paidBy?.name || 'Unknown')}</span>
                </p>
                <p style="font-size: 12px; color: rgba(255,255,255,0.6);">
                    <i class="fas fa-users" style="margin-right: 5px;"></i>
                    Split among ${expense.splitWith?.length || 0} people • ₹${splitAmount.toFixed(2)} each
                </p>
                <p style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 5px;">
                    <i class="fas fa-clock" style="margin-right: 5px;"></i>
                    ${formatDate(expense.createdAt)}
                </p>
            </div>
            <div style="text-align: right; margin-left: 15px;">
                <span style="font-weight: bold; font-size: 20px; color: #fff;">₹${expense.amount}</span>
                <br>
                ${isUserPayer ? `
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <button onclick="editExpense('${expense._id}')" 
                            style="padding: 6px 12px; font-size: 12px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 15px; cursor: pointer;">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button onclick="settleExpense('${expense._id}')" 
                            style="padding: 6px 12px; font-size: 12px; background: linear-gradient(135deg, #00e676, #43cea2); color: white; border: none; border-radius: 15px; cursor: pointer;">
                            <i class="fas fa-check"></i> Settle
                        </button>
                    </div>
                ` : `
                    <small style="color: rgba(255,255,255,0.6);">You owe: ₹${splitAmount.toFixed(2)}</small>
                `}
            </div>
        </div>
    `;
}

// Get category icon
function getCategoryIcon(category) {
    const icons = {
        food: 'fas fa-utensils',
        transport: 'fas fa-car',
        accommodation: 'fas fa-bed',
        entertainment: 'fas fa-film',
        utilities: 'fas fa-bolt',
        other: 'fas fa-receipt'
    };
    return icons[category] || icons.other;
}

// Update expense stats
function updateExpenseStats(expenses) {
    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const userShare = expenses.reduce((sum, exp) => {
        return sum + (exp.amount / (exp.splitWith?.length || 1));
    }, 0);
    
    document.getElementById("groupTotalExpenses").textContent = `₹${totalAmount.toFixed(2)}`;
    document.getElementById("yourShareAmount").textContent = `₹${userShare.toFixed(2)}`;
}

// Settle an expense
window.settleExpense = async (expenseId) => {
    if (!confirm("Are you sure you want to settle this expense? This action cannot be undone.")) {
        return;
    }

    try {
        const data = await api.expenses.delete(expenseId);
        
        showNotification("Expense settled successfully!", "success");
        await refreshDashboard();
        addToActivity("Settled an expense", "settlement");
    } catch (err) {
        console.error("Settle expense error:", err);
        showNotification(err.message || "Failed to settle expense. Please try again.", "error");
    }
};

// Handle add expense
async function handleAddExpense() {
    if (!selectedGroupId) {
        showNotification("Please select a group first!", "error");
        return;
    }
    
    const descInput = document.getElementById("description");
    const amountInput = document.getElementById("amount");
    const categorySelect = document.getElementById("category");
    const splitTypeSelect = document.getElementById("splitType");
    const notesInput = document.getElementById("expenseNotes");
    
    const description = descInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const category = categorySelect.value;
    const splitType = splitTypeSelect ? splitTypeSelect.value : "equal";
    const notes = notesInput ? notesInput.value.trim() : "";
    
    if (!description) {
        showNotification("Please enter a description", "error");
        descInput.focus();
        return;
    }
    
    if (!amount || amount <= 0) {
        showNotification("Please enter a valid amount greater than 0", "error");
        amountInput.focus();
        return;
    }

    if (amount > 1000000) {
        showNotification("Amount cannot exceed ₹10,00,000", "error");
        amountInput.focus();
        return;
    }

    const btn = document.getElementById("addExpenseBtn");
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    btn.disabled = true;
    
    try {
        console.log("Adding expense:", { description, amount, groupId: selectedGroupId, category, splitType });
        
        const data = await api.expenses.create({
            description,
            amount,
            groupId: selectedGroupId,
            category,
            splitType,
            notes
        });
        console.log("Expense creation response:", data);
        
        showNotification("Expense added successfully!", "success");
        descInput.value = "";
        amountInput.value = "";
        categorySelect.value = "other";
        if (splitTypeSelect) splitTypeSelect.value = "equal";
        if (notesInput) notesInput.value = "";
        
        console.log("Refreshing dashboard after expense creation...");
        await refreshDashboard();
        addToActivity(`Added expense: ${description}`, "expense");
    } catch (err) {
        console.error("Add expense error:", err);
        showNotification(err.message || "Failed to add expense. Please try again.", "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function updateBalances() {
    try {
        console.log("Fetching balance summary...");
        const data = await api.balances.getSummary();
        console.log("Balance data received:", data);
        
        const getElement = document.getElementById("totalGet");
        const payElement = document.getElementById("totalPay");
        const totalElement = document.getElementById("totalBalance");
        
        if (getElement) {
            getElement.textContent = `₹${data.get}`;
            console.log("Updated 'You will get' to:", data.get);
        }
        if (payElement) {
            payElement.textContent = `₹${data.pay}`;
            console.log("Updated 'You will pay' to:", data.pay);
        }
        if (totalElement) {
            totalElement.textContent = `₹${data.total}`;
            console.log("Updated 'Total balance' to:", data.total);
        }
        
        if (totalElement) {
            const balance = parseFloat(data.total);
            if (balance > 0) {
                totalElement.style.color = "#00e676";
            } else if (balance < 0) {
                totalElement.style.color = "#ff5252";
            } else {
                totalElement.style.color = "#ffd54f";
            }
        }
        
        if (parseFloat(data.get) === 0 && parseFloat(data.pay) === 0 && parseFloat(data.total) === 0) {
            console.log("All balances are zero - showing hint");
            const balanceCard = document.querySelector('.balance-summary');
            if (balanceCard && !document.getElementById('noExpensesHint')) {
                const hint = document.createElement('div');
                hint.id = 'noExpensesHint';
                hint.style.cssText = `
                    background: rgba(255, 193, 7, 0.1);
                    border: 1px solid rgba(255, 193, 7, 0.3);
                    border-radius: 10px;
                    padding: 15px;
                    margin-top: 15px;
                    text-align: center;
                    color: #ffc107;
                `;
                hint.innerHTML = `
                    <i class="fas fa-info-circle"></i>
                    <strong>No expenses yet!</strong><br>
                    Create a group and add some expenses to see your balances.
                `;
                balanceCard.appendChild(hint);
            }
        } else {
            console.log("Balances found - removing hint if exists");
            const hint = document.getElementById('noExpensesHint');
            if (hint) hint.remove();
        }
    } catch (err) {
        console.error("Error updating balances:", err);
        showNotification("Failed to load balances", "error");
    }
}

// Handle settle all debts
async function handleSettleAll() {
    if (!confirm("This will settle all your debts. Are you sure?")) {
        return;
    }
    
    showNotification("Feature coming soon!", "info");
}

// Handle export data
async function handleExportData() {
    try {
        const data = {
            groups: allGroups,
            expenses: currentExpenses,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `splitwise-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification("Data exported successfully!", "success");
        addToActivity("Exported data", "export");
    } catch (err) {
        console.error("Export error:", err);
        showNotification("Failed to export data", "error");
    }
}

// Handle send invite
async function handleSendInvite() {
    const email = document.getElementById("inviteEmail").value.trim();
    const groupId = document.getElementById("inviteToGroup").value;
    
    if (!email) {
        showNotification("Please enter an email address", "error");
        return;
    }
    
    if (!email.includes('@')) {
        showNotification("Please enter a valid email address", "error");
        return;
    }
    
    if (!groupId) {
        showNotification("Please select a group", "error");
        return;
    }
    
    try {
        const res = await fetch("http://localhost:5000/api/groups/add-member", {
            method: "POST",
            headers,
            body: JSON.stringify({ groupId, email })
        });

        const data = await res.json();
        
        if (res.ok) {
            showNotification("Invitation sent successfully!", "success");
            document.getElementById("inviteEmail").value = "";
            document.getElementById("inviteToGroup").value = "";
            hideModal('inviteModal');
            await refreshDashboard();
            addToActivity(`Invited ${email}`, "invite");
        } else {
            showNotification(data.message || "Failed to send invitation", "error");
        }
    } catch (err) {
        console.error("Invite error:", err);
        showNotification("Failed to send invitation", "error");
    }
}

// Update invite group options
function updateInviteGroupOptions(groups) {
    const select = document.getElementById("inviteToGroup");
    if (!select) return;
    
    select.innerHTML = '<option value="">Select a group</option>';
    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group._id;
        option.textContent = group.name;
        select.appendChild(option);
    });
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const activities = JSON.parse(localStorage.getItem('recentActivities') || '[]');
        const activityList = document.getElementById("activityList");
        const noActivityMsg = document.getElementById("noActivityMessage");
        
        if (activities.length === 0) {
            noActivityMsg.style.display = "block";
            activityList.style.display = "none";
            return;
        }
        
        noActivityMsg.style.display = "none";
        activityList.style.display = "block";
        activityList.innerHTML = "";
        
        activities.slice(0, 10).forEach(activity => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div style="padding: 12px; background: rgba(255,255,255,0.1); border-radius: 10px; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="${getActivityIcon(activity.type)}" style="color: #667eea;"></i>
                        <span style="color: #fff; font-size: 14px;">${escapeHtml(activity.description)}</span>
                    </div>
                    <small style="color: rgba(255,255,255,0.6); font-size: 11px; margin-left: 24px;">
                        ${formatDate(activity.timestamp)}
                    </small>
                </div>
            `;
            activityList.appendChild(li);
        });
    } catch (err) {
        console.error("Error loading activity:", err);
    }
}

// Add to activity
function addToActivity(description, type) {
    try {
        const activities = JSON.parse(localStorage.getItem('recentActivities') || '[]');
        activities.unshift({
            description,
            type,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 50 activities
        if (activities.length > 50) {
            activities.splice(50);
        }
        
        localStorage.setItem('recentActivities', JSON.stringify(activities));
        loadRecentActivity();
    } catch (err) {
        console.error("Error adding activity:", err);
    }
}

// Get activity icon
function getActivityIcon(type) {
    const icons = {
        expense: 'fas fa-receipt',
        settlement: 'fas fa-handshake',
        invite: 'fas fa-user-plus',
        export: 'fas fa-download',
        group: 'fas fa-users'
    };
    return icons[type] || 'fas fa-info-circle';
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        ${message}
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 4000);
}

function showLoading(show) {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) {
        overlay.style.display = show ? "flex" : "none";
    }
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = "block";
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = "none";
    }
}

// Initialize dashboard
refreshDashboard();

// Edit expense functionality
window.editExpense = async (expenseId) => {
    const expense = currentExpenses.find(exp => exp._id === expenseId);
    if (!expense) {
        showNotification("Expense not found", "error");
        return;
    }
    
    showEditExpenseModal(expense);
};

// Show edit expense modal
function showEditExpenseModal(expense) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('editExpenseModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'editExpenseModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2><i class="fas fa-edit"></i> Edit Expense</h2>
                <form id="editExpenseForm">
                    <div class="form-group">
                        <label for="editDescription">Description:</label>
                        <input type="text" id="editDescription" required>
                    </div>
                    <div class="form-group">
                        <label for="editAmount">Amount (₹):</label>
                        <input type="number" id="editAmount" step="0.01" min="0.01" required>
                    </div>
                    <div class="form-group">
                        <label for="editCategory">Category:</label>
                        <select id="editCategory">
                            <option value="food">🍽️ Food</option>
                            <option value="transport">🚗 Transport</option>
                            <option value="accommodation">🏠 Accommodation</option>
                            <option value="entertainment">🎬 Entertainment</option>
                            <option value="utilities">⚡ Utilities</option>
                            <option value="other">📦 Other</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="hideModal('editExpenseModal')" class="cancel-btn">Cancel</button>
                        <button type="submit" class="submit-btn">Update Expense</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelector('.close').addEventListener('click', () => {
            hideModal('editExpenseModal');
        });
        
        modal.querySelector('#editExpenseForm').addEventListener('submit', handleEditExpense);
    }
    
    // Populate form with current values
    document.getElementById('editDescription').value = expense.description;
    document.getElementById('editAmount').value = expense.amount;
    document.getElementById('editCategory').value = expense.category || 'other';
    
    // Store expense ID for update
    modal.dataset.expenseId = expense._id;
    
    showModal('editExpenseModal');
}

// Handle edit expense form submission
async function handleEditExpense(e) {
    e.preventDefault();
    
    const modal = document.getElementById('editExpenseModal');
    const expenseId = modal.dataset.expenseId;
    
    const description = document.getElementById('editDescription').value.trim();
    const amount = parseFloat(document.getElementById('editAmount').value);
    const category = document.getElementById('editCategory').value;
    
    if (!description || amount <= 0) {
        showNotification("Please fill all fields correctly", "error");
        return;
    }
    
    try {
        const res = await fetch(`http://localhost:5000/api/expenses/${expenseId}`, {
            method: "PUT",
            headers,
            body: JSON.stringify({ description, amount, category })
        });
        
        if (res.ok) {
            showNotification("Expense updated successfully!", "success");
            hideModal('editExpenseModal');
            await loadGroupExpenses(selectedGroupId, selectedGroupName);
            await updateBalances();
            addToActivity(`Updated expense: ${description}`, "expense");
        } else {
            const data = await res.json();
            showNotification(data.message || "Failed to update expense", "error");
        }
    } catch (err) {
        console.error("Error updating expense:", err);
        showNotification("Failed to update expense", "error");
    }
}

// Enhanced settle expense with settlement tracking
window.settleExpense = async (expenseId) => {
    const expense = currentExpenses.find(exp => exp._id === expenseId);
    if (!expense) {
        showNotification("Expense not found", "error");
        return;
    }
    
    if (!confirm(`Are you sure you want to settle "${expense.description}"? This will remove it from the group.`)) {
        return;
    }
    
    try {
        const res = await fetch(`http://localhost:5000/api/expenses/${expenseId}`, {
            method: "DELETE",
            headers
        });
        
        if (res.ok) {
            showNotification("Expense settled successfully!", "success");
            await loadGroupExpenses(selectedGroupId, selectedGroupName);
            await updateBalances();
            addToActivity(`Settled expense: ${expense.description}`, "settlement");
        } else {
            const data = await res.json();
            showNotification(data.message || "Failed to settle expense", "error");
        }
    } catch (err) {
        console.error("Error settling expense:", err);
        showNotification("Failed to settle expense", "error");
    }
};

// Add expense history functionality
async function loadExpenseHistory(page = 1, category = 'all') {
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: '20'
        });
        
        if (category !== 'all') {
            params.append('category', category);
        }
        
        const res = await fetch(`http://localhost:5000/api/expenses/history/user?${params}`, { headers });
        
        if (res.ok) {
            const data = await res.json();
            return data;
        } else {
            throw new Error('Failed to load expense history');
        }
    } catch (err) {
        console.error("Error loading expense history:", err);
        showNotification("Failed to load expense history", "error");
        return null;
    }
}

// Search and filter functionality
function setupSearchAndFilter() {
    // Add search input to dashboard if not exists
    const searchContainer = document.getElementById('searchContainer');
    if (searchContainer) {
        searchContainer.innerHTML = `
            <div class="search-filter-bar">
                <input type="text" id="expenseSearch" placeholder="Search expenses..." />
                <select id="categoryFilter">
                    <option value="all">All Categories</option>
                    <option value="food">Food</option>
                    <option value="transport">Transport</option>
                    <option value="accommodation">Accommodation</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="utilities">Utilities</option>
                    <option value="other">Other</option>
                </select>
            </div>
        `;
        
        // Add event listeners
        document.getElementById('expenseSearch').addEventListener('input', filterExpenses);
        document.getElementById('categoryFilter').addEventListener('change', filterExpenses);
    }
}

// Filter expenses based on search and category
function filterExpenses() {
    const searchTerm = document.getElementById('expenseSearch')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || 'all';
    
    const expenseItems = document.querySelectorAll('#expenseList li');
    
    expenseItems.forEach(item => {
        const description = item.textContent.toLowerCase();
        const matchesSearch = description.includes(searchTerm);
        const expense = currentExpenses.find(exp => description.includes(exp.description.toLowerCase()));
        const matchesCategory = categoryFilter === 'all' || (expense && expense.category === categoryFilter);
        
        if (matchesSearch && matchesCategory) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}