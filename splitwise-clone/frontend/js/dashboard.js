const token = localStorage.getItem('token');
if (!token) {
  window.location.href = 'index.html';
}

let selectedGroupId = null;
let selectedGroupName = null;
let currentUser = null;
let allGroups = [];
let currentExpenses = [];

document.addEventListener('DOMContentLoaded', async function () {
  await refreshDashboard();
  setupEventListeners();
  setupModals();
  loadRecentActivity();
  setupWebSockets();
});

function setupWebSockets() {
  if (typeof io !== 'undefined') {
    const socket = io(API_BASE_URL, {
      withCredentials: true,
    });
    socket.on('connect', () => console.log('Live Sync Active'));
    socket.on('updateData', async () => {
      ui.showNotification('Live update received! 🔄', 'info');
      await refreshDashboard();
    });
  }
}

window.addEventListener('focus', function () {
  setTimeout(async () => {
    await fetchCurrentUserFromServer();
  }, 500);
});

async function fetchCurrentUserFromServer() {
  try {
    const data = await dashboardService.getCurrentUser();
    if (data) {
      currentUser = data.user;
      localStorage.setItem('user', JSON.stringify(currentUser));
      updateDashboardProfilePicture();
    }
  } catch (err) {
    console.error('Error fetching user from server:', err);
  }
}

function updateDashboardProfilePicture() {
  const profilePic = document.getElementById('dashboardProfilePic');
  const defaultIcon = document.getElementById('defaultProfileIcon');

  if (profilePic && currentUser) {
    if (currentUser.profileImage) {
      profilePic.src = `${API_BASE_URL}${currentUser.profileImage}`;
      profilePic.style.display = 'block';
      if (defaultIcon) defaultIcon.style.display = 'none';
    } else {
      profilePic.src = 'https://via.placeholder.com/44x44/667eea/ffffff?text=👤';
      profilePic.style.display = 'block';
      if (defaultIcon) defaultIcon.style.display = 'none';
    }

    profilePic.onerror = function () {
      this.style.display = 'none';
      if (defaultIcon) defaultIcon.style.display = 'flex';
    };
  }
}

function setupEventListeners() {
  const actions = {
    logoutBtn: handleLogout,
    profileBtn: () => (window.location.href = 'profile.html'),
    createGroupBtn: handleCreateGroup,
    addExpenseBtn: handleAddExpense,
    settleAllBtn: handleSettleAll,
    exportDataBtn: handleExportData,
    inviteFriendsBtn: () => showModal('inviteModal'),
  };

  Object.entries(actions).forEach(([id, handler]) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', handler);
  });

  const inputs = ['description', 'amount'];
  inputs.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', validateExpenseForm);
  });
}

function setupModals() {
  document.querySelectorAll('.close').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.closest('.modal').style.display = 'none';
    });
  });

  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.style.display = 'none';
    }
  });

  const sendInviteBtn = document.getElementById('sendInvite');
  const cancelInviteBtn = document.getElementById('cancelInvite');

  if (sendInviteBtn) sendInviteBtn.addEventListener('click', handleSendInvite);
  if (cancelInviteBtn) cancelInviteBtn.addEventListener('click', () => hideModal('inviteModal'));
}

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  ui.showNotification('Logged out successfully!', 'success');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1000);
}

async function refreshDashboard() {
  ui.showLoading(true);
  try {
    await Promise.all([fetchCurrentUserFromServer(), loadGroups(), updateBalances()]);

    if (selectedGroupId) {
      await loadGroupExpenses(selectedGroupId, selectedGroupName);
    }

    updateExpenseFormState();
  } catch (err) {
    console.error('Error refreshing dashboard:', err);
    ui.showNotification('Failed to refresh dashboard data', 'error');
  } finally {
    ui.showLoading(false);
  }
}

async function loadGroups() {
  try {
    const groups = await dashboardService.getGroups();
    allGroups = groups;
    const list = document.getElementById('groupList');
    const noGroupsMsg = document.getElementById('noGroupsMessage');

    list.innerHTML = '';

    if (!groups.length) {
      noGroupsMsg.style.display = 'block';
      return;
    }

    noGroupsMsg.style.display = 'none';
    groups.forEach((group) => renderGroup(group));
    updateInviteGroupOptions(groups);
  } catch (err) {
    ui.showNotification('Failed to load groups', 'error');
  }
}

function renderGroup(group) {
  const list = document.getElementById('groupList');
  const li = document.createElement('li');
  li.className = 'fade-in';
  li.dataset.groupId = group._id;
  if (selectedGroupId === group._id) li.classList.add('selected');

  const members = Array.isArray(group.members) ? group.members : [];
  const displayNames = members.slice(0, 3).join(', ');
  const more = members.length > 3 ? ` +${members.length - 3} more` : '';

  li.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="color: #fff; font-size: 16px;">
                    <i class="fas fa-users" style="margin-right: 8px; color: #667eea;"></i>
                    ${ui.escapeHtml(group.name)}
                </strong>
                <div style="display: flex; gap: 8px;">
                    <button onclick="event.stopPropagation(); showModal('inviteModal')"
                        style="padding:6px 12px; font-size:11px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 15px; cursor: pointer;">
                        <i class="fas fa-user-plus"></i> Invite
                    </button>
                    <button onclick="handleDeleteGroup(event, '${group._id}', '${ui.escapeHtml(group.name)}')"
                        style="padding:6px 12px; font-size:11px; background: linear-gradient(135deg, #ff5252, #dd2476); color: white; border: none; border-radius: 15px; cursor: pointer;">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
            <p style="font-size:13px; color: rgba(255,255,255,0.8); margin: 5px 0;">${ui.escapeHtml(group.description || 'No description')}</p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <small style="color: rgba(255,255,255,0.7); font-size: 11px;">${ui.escapeHtml(displayNames)}${more}</small>
                <small style="color: #667eea; font-weight: bold; font-size: 12px;">${members.length} members</small>
            </div>
        </div>
    `;

  li.onclick = () => selectGroup(group._id, group.name);
  list.appendChild(li);
}

function selectGroup(id, name) {
  selectedGroupId = id;
  selectedGroupName = name;

  document.querySelectorAll('#groupList li').forEach((li) => {
    li.classList.toggle('selected', li.dataset.groupId === id);
  });

  document.getElementById('selectedGroupInfo').style.display = 'block';
  document.getElementById('selectedGroupName').textContent = name;
  document.getElementById('noGroupSelected').style.display = 'none';
  document.getElementById('expenseForm').style.display = 'block';

  loadGroupExpenses(id, name);
  updateExpenseFormState();
}

async function loadGroupExpenses(groupId, groupName) {
  try {
    const expenses = await dashboardService.getGroupExpenses(groupId);
    currentExpenses = expenses;

    const list = document.getElementById('expenseList');
    const msg = document.getElementById('noExpensesMessage');
    document.getElementById('expenseCardTitle').innerHTML =
      `<i class="fas fa-list"></i> ${groupName} Expenses`;

    list.innerHTML = '';
    if (!expenses.length) {
      msg.style.display = 'block';
      list.style.display = 'none';
    } else {
      msg.style.display = 'none';
      list.style.display = 'block';
      expenses.forEach((exp) => {
        const li = document.createElement('li');
        li.innerHTML = renderExpenseItem(exp);
        list.appendChild(li);
      });
    }
    updateExpenseStats(expenses);
    document.getElementById('expenseDetailCard').style.display = 'block';
  } catch (err) {
    ui.showNotification('Failed to load expenses', 'error');
  }
}

function renderExpenseItem(exp) {
  const split = exp.amount / (exp.splitWith?.length || 1);
  const isPayer = exp.paidBy?._id === currentUser?.id || exp.paidBy === currentUser?.id;

  return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: rgba(255,255,255,0.1); border-radius: 12px; margin: 8px 0; border-left: 4px solid ${isPayer ? '#00e676' : '#667eea'};">
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <i class="${getCategoryIcon(exp.category)}" style="color: #667eea; font-size: 16px;"></i>
                    <strong style="color: #fff; font-size: 16px;">${ui.escapeHtml(exp.description)}</strong>
                    ${isPayer ? '<span style="background: #00e676; color: #000; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold;">YOU PAID</span>' : ''}
                </div>
                <p style="font-size: 13px; color: rgba(255,255,255,0.8);">Paid by: ${ui.escapeHtml(exp.paidBy?.name || 'Unknown')}</p>
                <small style="color: rgba(255,255,255,0.5);">${ui.formatDate(exp.createdAt)} • ₹${split.toFixed(2)} each</small>
            </div>
            <div style="text-align: right;">
                <span style="font-weight: bold; font-size: 20px; color: #fff;">₹${exp.amount}</span>
                ${
                  isPayer
                    ? `
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <button onclick="handleDeleteExpense('${exp._id}')" style="padding: 6px 12px; font-size: 12px; background: #ff5252; color: white; border: none; border-radius: 15px; cursor: pointer;"><i class="fas fa-trash"></i></button>
                    </div>
                `
                    : `<p style="font-size: 11px; color: #ff5252;">You owe: ₹${split.toFixed(2)}</p>`
                }
            </div>
        </div>
    `;
}

function updateExpenseStats(expenses) {
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  let userShareTotal = 0;

  expenses.forEach((exp) => {
    const split = exp.amount / (exp.splitWith?.length || 1);
    if (exp.paidBy?._id === currentUser?.id || exp.paidBy === currentUser?.id) {
      userShareTotal += exp.amount - split;
    } else if (exp.splitWith?.some((m) => (m._id || m) === currentUser?.id)) {
      userShareTotal -= split;
    }
  });

  const els = {
    total: document.getElementById('groupTotalExpenses'),
    share: document.getElementById('yourShareAmount'),
  };

  if (els.total) els.total.textContent = `₹${total.toFixed(2)}`;
  if (els.share) {
    els.share.textContent = `₹${Math.abs(userShareTotal).toFixed(2)}`;
    els.share.style.color = userShareTotal >= 0 ? '#00e676' : '#ff5252';
  }
}

async function handleAddExpense() {
  const desc = document.getElementById('description').value.trim();
  const amount = parseFloat(document.getElementById('amount').value);
  const cat = document.getElementById('category').value;

  if (!desc || !amount || amount <= 0) {
    ui.showNotification('Invalid input', 'error');
    return;
  }

  try {
    await dashboardService.addExpense({
      description: desc,
      amount,
      groupId: selectedGroupId,
      category: cat,
    });
    ui.showNotification('Expense added!', 'success');
    document.getElementById('description').value = '';
    document.getElementById('amount').value = '';
    await refreshDashboard();
  } catch (err) {
    ui.showNotification(err.message, 'error');
  }
}

async function updateBalances() {
  try {
    const data = await dashboardService.getBalanceSummary();
    if (!data) return;

    const els = {
      get: document.getElementById('totalGet'),
      pay: document.getElementById('totalPay'),
      total: document.getElementById('totalBalance'),
    };

    if (els.get) els.get.textContent = `₹${data.get}`;
    if (els.pay) els.pay.textContent = `₹${data.pay}`;
    if (els.total) {
      els.total.textContent = `₹${data.total}`;
      const bal = parseFloat(data.total);
      els.total.style.color = bal > 0 ? '#00e676' : bal < 0 ? '#ff5252' : '#ffd54f';
    }
    updateNoExpensesHint(data);
  } catch (err) {
    ui.showNotification('Balance error', 'error');
  }
}

function updateNoExpensesHint(data) {
  const isZero =
    parseFloat(data.get) === 0 && parseFloat(data.pay) === 0 && parseFloat(data.total) === 0;
  const existing = document.getElementById('noExpensesHint');
  if (isZero && !existing) {
    const card = document.querySelector('.balance-summary');
    if (card) {
      const hint = document.createElement('div');
      hint.id = 'noExpensesHint';
      hint.style.cssText = `background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 10px; padding: 15px; margin-top: 15px; text-align: center; color: #ffc107;`;
      hint.innerHTML = `<i class="fas fa-info-circle"></i> <strong>No expenses yet!</strong>`;
      card.appendChild(hint);
    }
  } else if (!isZero && existing) {
    existing.remove();
  }
}

async function loadRecentActivity() {
  try {
    const data = await apiClient.get('/api/profile/activity');
    const list = document.getElementById('activityList');
    const msg = document.getElementById('noActivityMessage');

    if (!data?.recentExpenses?.length) {
      msg.style.display = 'block';
      return;
    }

    msg.style.display = 'none';
    list.innerHTML = data.recentExpenses
      .map(
        (exp) => `
            <li class="fade-in" style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 12px;">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(102, 126, 234, 0.2); display: flex; align-items: center; justify-content: center; color: #667eea;">
                    <i class="${getCategoryIcon(exp.category)}"></i>
                </div>
                <div style="flex: 1;">
                    <p style="font-size: 13px; margin: 0; color: #fff;">${ui.escapeHtml(exp.description)}</p>
                    <small style="color: rgba(255,255,255,0.5); font-size: 11px;">₹${exp.amount} • ${ui.formatDate(exp.createdAt)}</small>
                </div>
            </li>
        `
      )
      .join('');
  } catch (err) {
    console.error('Activity error:', err);
  }
}

function getCategoryIcon(category) {
  const icons = {
    food: 'fas fa-utensils',
    transport: 'fas fa-car',
    accommodation: 'fas fa-bed',
    entertainment: 'fas fa-film',
    utilities: 'fas fa-bolt',
    other: 'fas fa-receipt',
  };
  return icons[category] || icons.other;
}

async function handleCreateGroup() {
  const name = document.getElementById('groupName').value.trim();
  if (!name) return ui.showNotification('Name required', 'error');

  try {
    await dashboardService.createGroup({
      name,
      description: document.getElementById('groupDesc').value.trim(),
      emails: document
        .getElementById('groupMembers')
        .value.split(',')
        .map((m) => m.trim())
        .filter((m) => m),
    });
    ui.showNotification('Group created!', 'success');
    await refreshDashboard();
  } catch (err) {
    ui.showNotification(err.message, 'error');
  }
}

async function handleDeleteGroup(e, id, name) {
  e.stopPropagation();
  if (!confirm(`Delete ${name}?`)) return;
  try {
    await dashboardService.deleteGroup(id);
    ui.showNotification('Deleted', 'success');
    if (selectedGroupId === id) {
      selectedGroupId = null;
      updateExpenseFormState();
    }
    await refreshDashboard();
  } catch (err) {
    ui.showNotification(err.message, 'error');
  }
}

async function handleDeleteExpense(id) {
  if (!confirm('Settle/Delete this expense?')) return;
  try {
    await dashboardService.deleteExpense(id);
    ui.showNotification('Settled', 'success');
    await refreshDashboard();
  } catch (err) {
    ui.showNotification(err.message, 'error');
  }
}

async function handleSendInvite() {
  const email = document.getElementById('inviteEmail').value.trim();
  const groupId = document.getElementById('inviteGroupSelect').value;
  if (!email || !groupId) return ui.showNotification('Fields required', 'warning');
  try {
    await dashboardService.inviteMember(groupId, email);
    ui.showNotification('Invited!', 'success');
    hideModal('inviteModal');
  } catch (err) {
    ui.showNotification(err.message, 'error');
  }
}

async function handleExportData() {
  ui.showNotification('Generating Official PDF Statement...', 'info');
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/export/pdf/user/all`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to generate PDF');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'splitwise_statement.pdf';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    ui.showNotification('PDF Exported successfully! 📄', 'success');
  } catch (err) {
    ui.showNotification(err.message, 'error');
  }
}

function handleSettleAll() {
  window.location.href = 'balances.html';
}

function showModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'block';
}
function hideModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}
function validateExpenseForm() {
  const desc = document.getElementById('description').value.trim();
  const amount = document.getElementById('amount').value;
  const btn = document.getElementById('addExpenseBtn');
  if (btn) btn.disabled = !selectedGroupId || !desc || !amount || amount <= 0;
}
function updateExpenseFormState() {
  const hasGroup = !!selectedGroupId;
  document.getElementById('expenseForm').style.display = hasGroup ? 'block' : 'none';
  document.getElementById('noGroupSelected').style.display = hasGroup ? 'none' : 'block';
  document.getElementById('selectedGroupInfo').style.display = hasGroup ? 'block' : 'none';
  if (hasGroup) document.getElementById('selectedGroupName').textContent = selectedGroupName;
}
function updateInviteGroupOptions(groups) {
  const select = document.getElementById('inviteGroupSelect');
  if (select)
    select.innerHTML =
      '<option value="">Select a group</option>' +
      groups.map((g) => `<option value="${g._id}">${ui.escapeHtml(g.name)}</option>`).join('');
}
