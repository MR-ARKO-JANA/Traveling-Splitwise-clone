async function loadBalanceDetails() {
    try {
        const summary = await balanceService.getSummary();
        
        document.getElementById("totalOwed").textContent = `₹${summary.get}`;
        document.getElementById("totalOwe").textContent = `₹${summary.pay}`;
        document.getElementById("netBalance").textContent = `₹${summary.total}`;
        
        const netAmount = parseFloat(summary.total);
        const netCard = document.querySelector('.balance-detail-card.neutral');
        if (netCard) {
            netCard.className = `balance-detail-card ${netAmount > 0 ? 'positive' : netAmount < 0 ? 'negative' : 'neutral'}`;
        }
        
        const details = await balanceService.getDetails();
        renderPersonBalances(details);
        
    } catch (err) {
        console.error("Error loading balance details:", err);
        const container = document.getElementById("personBalances");
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; color: #ff5252; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 15px;"></i>
                    <p>Failed to load balance details</p>
                </div>
            `;
        }
    }
}

function renderPersonBalances(details) {
    const container = document.getElementById("personBalances");
    if (!container) return;
    
    if (Object.keys(details).length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: rgba(255,255,255,0.6); padding: 40px;">
                <i class="fas fa-handshake" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
                <p>All settled up!</p>
                <small>You don't owe anyone, and no one owes you.</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = "";
    
    Object.entries(details).forEach(([personId, person]) => {
        const balance = person.balance;
        const isPositive = balance > 0;
        const absBalance = Math.abs(balance);
        
        const personDiv = document.createElement('div');
        personDiv.className = `person-balance ${isPositive ? 'owes-you' : 'you-owe'}`;
        
        personDiv.innerHTML = `
            <div class="person-info">
                <div class="person-avatar">
                    ${person.name.charAt(0).toUpperCase()}
                </div>
                <div class="person-details">
                    <h4>${ui.escapeHtml(person.name)}</h4>
                    <p>${ui.escapeHtml(person.email)}</p>
                    <small style="color: rgba(255,255,255,0.5);">
                        ${person.expenses?.length || 0} shared expense${(person.expenses?.length || 0) !== 1 ? 's' : ''}
                    </small>
                </div>
            </div>
            <div class="balance-amount ${isPositive ? 'positive' : 'negative'}">
                <div class="amount">₹${absBalance.toFixed(2)}</div>
                <p style="font-size: 12px; color: rgba(255,255,255,0.7);">
                    ${isPositive ? 'owes you' : 'you owe'}
                </p>
                ${isPositive ? `
                    <button class="settle-btn" onclick="handleRequestSettlement('${personId}', '${ui.escapeHtml(person.name)}', ${absBalance})">
                        <i class="fas fa-bell"></i> Request
                    </button>
                ` : `
                    <button class="settle-btn" onclick="handleSettleDebt('${personId}', '${ui.escapeHtml(person.name)}', ${absBalance})">
                        <i class="fas fa-check"></i> Settle
                    </button>
                `}
            </div>
        `;
        
        container.appendChild(personDiv);
    });
}

async function loadRecentTransactions() {
    try {
        const data = await userService.getActivity();
        const container = document.getElementById("recentTransactions");
        if (!container) return;
        
        if (!data.recentExpenses || data.recentExpenses.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: rgba(255,255,255,0.6); padding: 40px;">
                    <i class="fas fa-receipt" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
                    <p>No recent transactions</p>
                    <small>Your expense history will appear here</small>
                </div>
            `;
            return;
        }
        
        container.innerHTML = "";
        
        data.recentExpenses.slice(0, 10).forEach(expense => {
            const expenseDiv = document.createElement('div');
            expenseDiv.className = 'expense-item';
            
            const categoryIcon = ui.getCategoryIcon(expense.category);
            const splitAmount = expense.amount / (expense.splitWith?.length || 1);
            
            expenseDiv.innerHTML = `
                <div class="expense-info">
                    <div class="expense-icon">
                        <i class="${categoryIcon}"></i>
                    </div>
                    <div class="expense-details">
                        <h4>${ui.escapeHtml(expense.description)}</h4>
                        <p>
                            Paid by ${ui.escapeHtml(expense.paidBy?.name || 'Unknown')} • 
                            ${ui.formatDate(expense.createdAt)}
                        </p>
                        <small style="color: rgba(255,255,255,0.5);">
                            Split among ${expense.splitWith?.length || 0} people
                        </small>
                    </div>
                </div>
                <div class="expense-amount">
                    <div>₹${expense.amount.toFixed(2)}</div>
                    <small style="color: rgba(255,255,255,0.7);">
                        Your share: ₹${splitAmount.toFixed(2)}
                    </small>
                </div>
            `;
            
            container.appendChild(expenseDiv);
        });
        
    } catch (err) {
        console.error("Error loading transactions:", err);
        const container = document.getElementById("recentTransactions");
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; color: #ff5252; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 15px;"></i>
                    <p>Failed to load transaction history</p>
                </div>
            `;
        }
    }
}

async function handleRequestSettlement(personId, personName, amount) {
    if (confirm(`Send a settlement request to ${personName} for ₹${amount.toFixed(2)}?`)) {
        ui.showNotification(`Settlement request sent to ${personName}!`, "success");
    }
}

async function handleSettleDebt(personId, personName, amount) {
    if (confirm(`Mark your debt of ₹${amount.toFixed(2)} to ${personName} as settled?`)) {
        try {
            await balanceService.settleDebt({ toUserId: personId, amount });
            ui.showNotification(`Debt to ${personName} settled!`, "success");
            loadBalanceDetails();
        } catch (err) {
            ui.showNotification(err.message, "error");
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "index.html";
        return;
    }
    loadBalanceDetails();
    loadRecentTransactions();
});