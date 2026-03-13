// Balances page functionality
const token = localStorage.getItem("token");
if (!token) {
    window.location.href = "index.html";
}

const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
};

let currentUser = null;
let balanceDetails = {};

// Initialize balances page
document.addEventListener('DOMContentLoaded', async function() {
    await loadCurrentUser();
    await loadBalanceSummary();
    await loadBalanceDetails();
    await loadSettlementHistory();
    setupEventListeners();
});

// Load current user
async function loadCurrentUser() {
    try {
        const stored = localStorage.getItem("user");
        if (stored) {
            currentUser = JSON.parse(stored);
        } else {
            const data = await api.profile.getPassport();
            currentUser = data.user;
            localStorage.setItem("user", JSON.stringify(currentUser));
        }
    } catch (err) {
        console.error("Error loading user:", err);
    }
}

// Load balance summary
async function loadBalanceSummary() {
    try {
        const data = await api.balances.getSummary();
        updateBalanceSummaryCards(data);
    } catch (err) {
        console.error("Error loading balance summary:", err);
        showNotification("Failed to load balance summary", "error");
    }
}

// Update balance summary cards
function updateBalanceSummaryCards(data) {
    const getCard = document.querySelector('.balance-detail-card.positive .amount');
    const payCard = document.querySelector('.balance-detail-card.negative .amount');
    const totalCard = document.querySelector('.balance-detail-card.neutral .amount');
    
    if (getCard) getCard.textContent = `₹${data.get}`;
    if (payCard) payCard.textContent = `₹${data.pay}`;
    if (totalCard) {
        totalCard.textContent = `₹${Math.abs(parseFloat(data.total)).toFixed(2)}`;
        const card = totalCard.closest('.balance-detail-card');
        card.className = 'balance-detail-card ' + (parseFloat(data.total) > 0 ? 'positive' : parseFloat(data.total) < 0 ? 'negative' : 'neutral');
    }
}

// Load detailed balance breakdown
async function loadBalanceDetails() {
    try {
        const data = await api.balances.getDetails();
        balanceDetails = data;
        displayBalanceBreakdown(data);
    } catch (err) {
        console.error("Error loading balance details:", err);
        showNotification("Failed to load balance details", "error");
    }
}

// Display balance breakdown
function displayBalanceBreakdown(balances) {
    const container = document.querySelector('.balance-breakdown');
    if (!container) return;
    
    const balanceList = container.querySelector('.balance-list') || createBalanceList(container);
    balanceList.innerHTML = '';
    
    const balanceEntries = Object.entries(balances);
    
    if (balanceEntries.length === 0) {
        balanceList.innerHTML = `
            <div class="no-balances">
                <i class="fas fa-check-circle" style="font-size: 48px; color: #00e676; margin-bottom: 15px;"></i>
                <h3>All settled up!</h3>
                <p>You don't owe anyone, and no one owes you.</p>
            </div>
        `;
        return;
    }
    
    balanceEntries.forEach(([userId, balance]) => {
        const balanceItem = createBalanceItem(userId, balance);
        balanceList.appendChild(balanceItem);
    });
}

// Create balance list container
function createBalanceList(container) {
    const balanceList = document.createElement('div');
    balanceList.className = 'balance-list';
    container.appendChild(balanceList);
    return balanceList;
}

// Create individual balance item
function createBalanceItem(userId, balance) {
    const item = document.createElement('div');
    item.className = `person-balance ${balance.balance > 0 ? 'owes-you' : 'you-owe'}`;
    
    const absAmount = Math.abs(balance.balance).toFixed(2);
    const isOwedToYou = balance.balance > 0;
    
    item.innerHTML = `
        <div class="person-info">
            <div class="person-details">
                <h4>${escapeHtml(balance.name)}</h4>
                <p>${escapeHtml(balance.email)}</p>
                <small>${balance.expenses.length} transaction${balance.expenses.length !== 1 ? 's' : ''}</small>
            </div>
        </div>
        <div class="balance-info">
            <div class="balance-amount ${isOwedToYou ? 'positive' : 'negative'}">
                ${isOwedToYou ? `₹${absAmount}` : `₹${absAmount}`}
            </div>
            <div class="balance-status">
                ${isOwedToYou ? 'owes you' : 'you owe'}
            </div>
            <div class="balance-actions">
                ${isOwedToYou ? `
                    <button onclick="requestPayment('${userId}', ${absAmount})" class="request-btn">
                        <i class="fas fa-paper-plane"></i> Request
                    </button>
                ` : `
                    <button onclick="settleBalance('${userId}', ${absAmount})" class="settle-btn">
                        <i class="fas fa-check"></i> Settle Up
                    </button>
                `}
                <button onclick="viewTransactionHistory('${userId}')" class="history-btn">
                    <i class="fas fa-history"></i> History
                </button>
            </div>
        </div>
    `;
    
    return item;
}

// Settlement functionality
window.settleBalance = async (userId, amount) => {
    const balance = balanceDetails[userId];
    if (!balance) return;
    
    const confirmed = confirm(`Settle ₹${amount} with ${balance.name}?`);
    if (!confirmed) return;
    
    try {
        const data = await api.balances.settle(userId, amount);
        
        showNotification(`Successfully settled ₹${amount} with ${balance.name}!`, "success");
        await loadBalanceSummary();
        await loadBalanceDetails();
        await loadSettlementHistory();
    } catch (err) {
        console.error("Error settling balance:", err);
        showNotification("Failed to record settlement", "error");
    }
};

// Request payment functionality
window.requestPayment = async (userId, amount) => {
    const balance = balanceDetails[userId];
    if (!balance) return;
    
    // For now, just show a notification (could be enhanced with email/SMS)
    showNotification(`Payment request sent to ${balance.name} for ₹${amount}`, "info");
};

// View transaction history
window.viewTransactionHistory = (userId) => {
    const balance = balanceDetails[userId];
    if (!balance) return;
    
    showTransactionHistoryModal(balance);
};

// Show transaction history modal
function showTransactionHistoryModal(balance) {
    let modal = document.getElementById('transactionHistoryModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'transactionHistoryModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2 id="historyModalTitle">Transaction History</h2>
                <div id="transactionList" class="transaction-list"></div>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.querySelector('.close').addEventListener('click', () => {
            hideModal('transactionHistoryModal');
        });
    }
    
    // Update modal content
    document.getElementById('historyModalTitle').textContent = `Transactions with ${balance.name}`;
    
    const transactionList = document.getElementById('transactionList');
    transactionList.innerHTML = '';
    
    if (balance.expenses.length === 0) {
        transactionList.innerHTML = '<p>No transactions found.</p>';
    } else {
        balance.expenses.forEach(expense => {
            const item = document.createElement('div');
            item.className = 'transaction-item';
            item.innerHTML = `
                <div class="transaction-info">
                    <h4>${escapeHtml(expense.description)}</h4>
                    <small>${formatDate(expense.date)}</small>
                </div>
                <div class="transaction-amount ${expense.amount > 0 ? 'positive' : 'negative'}">
                    ${expense.amount > 0 ? '+' : ''}₹${Math.abs(expense.amount).toFixed(2)}
                </div>
            `;
            transactionList.appendChild(item);
        });
    }
    
    showModal('transactionHistoryModal');
}

// Load settlement history
async function loadSettlementHistory() {
    try {
        const settlements = await api.balances.getSettlements();
        displaySettlementHistory(settlements);
    } catch (err) {
        console.error("Error loading settlement history:", err);
    }
}

// Display settlement history
function displaySettlementHistory(settlements) {
    const container = document.getElementById('settlementHistory');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (settlements.length === 0) {
        container.innerHTML = '<p>No settlements yet.</p>';
        return;
    }
    
    settlements.slice(0, 10).forEach(settlement => {
        const item = document.createElement('div');
        item.className = 'settlement-item';
        
        const isFromCurrentUser = settlement.from._id === currentUser._id;
        const otherUser = isFromCurrentUser ? settlement.to : settlement.from;
        
        item.innerHTML = `
            <div class="settlement-info">
                <h4>${isFromCurrentUser ? 'Paid to' : 'Received from'} ${escapeHtml(otherUser.name)}</h4>
                <small>${formatDate(settlement.settledAt)}</small>
                ${settlement.note ? `<p class="settlement-note">${escapeHtml(settlement.note)}</p>` : ''}
            </div>
            <div class="settlement-amount ${isFromCurrentUser ? 'negative' : 'positive'}">
                ${isFromCurrentUser ? '-' : '+'}₹${settlement.amount.toFixed(2)}
            </div>
        `;
        
        container.appendChild(item);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    const backBtn = document.getElementById('backToDashboard');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });
    }
    
    // Modal close functionality
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
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
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString();
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 4000);
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}