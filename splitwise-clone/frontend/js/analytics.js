// Analytics page functionality
const token = localStorage.getItem("token");
if (!token) {
    window.location.href = "index.html";
}

const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
};

let currentPeriod = 7;
let expenseData = [];
let categoryChart = null;
let trendChart = null;

// Initialize analytics page
document.addEventListener('DOMContentLoaded', async function() {
    setupEventListeners();
    await loadAnalyticsData();
});

// Setup event listeners
function setupEventListeners() {
    // Time filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentPeriod = parseInt(this.dataset.period);
            loadAnalyticsData();
        });
    });
}

// Load analytics data
async function loadAnalyticsData() {
    try {
        showLoading(true);
        
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - currentPeriod);
        
        // Load expense history
        const params = new URLSearchParams({
            page: '1',
            limit: '1000',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
        });
        
        const res = await fetch(`${API_BASE_URL}/api/expenses/history/user?${params}`, { headers });
        
        if (res.ok) {
            const data = await res.json();
            expenseData = data.expenses || [];
            
            updateStatistics();
            updateCharts();
            updateCategoryBreakdown();
        } else {
            throw new Error('Failed to load analytics data');
        }
    } catch (err) {
        console.error("Error loading analytics:", err);
        showNotification("Failed to load analytics data", "error");
    } finally {
        showLoading(false);
    }
}

// Update statistics cards
function updateStatistics() {
    const totalExpenses = expenseData.reduce((sum, exp) => {
        // Only count expenses paid by current user
        return sum + (exp.paidBy._id === getCurrentUserId() ? exp.amount : 0);
    }, 0);
    
    const avgPerDay = totalExpenses / currentPeriod;
    const activeGroups = new Set(expenseData.map(exp => exp.group._id)).size;
    const totalTransactions = expenseData.length;
    
    document.getElementById('totalExpenses').textContent = `₹${totalExpenses.toFixed(2)}`;
    document.getElementById('avgPerDay').textContent = `₹${avgPerDay.toFixed(2)}`;
    document.getElementById('activeGroups').textContent = activeGroups;
    document.getElementById('totalTransactions').textContent = totalTransactions;
    
    // Update change indicators
    document.getElementById('expenseChange').textContent = `Last ${currentPeriod} days`;
    document.getElementById('avgChange').textContent = `₹${(totalExpenses / totalTransactions || 0).toFixed(2)} per transaction`;
    document.getElementById('groupChange').textContent = `${activeGroups} group${activeGroups !== 1 ? 's' : ''}`;
    document.getElementById('transactionChange').textContent = `${totalTransactions} expense${totalTransactions !== 1 ? 's' : ''}`;
}

// Update charts
function updateCharts() {
    updateCategoryChart();
    updateTrendChart();
}

// Update category pie chart
function updateCategoryChart() {
    const categoryData = {};
    const categoryColors = {
        food: '#FF6384',
        transport: '#36A2EB',
        accommodation: '#FFCE56',
        entertainment: '#4BC0C0',
        utilities: '#9966FF',
        other: '#FF9F40'
    };
    
    // Only count expenses paid by current user
    expenseData.forEach(expense => {
        if (expense.paidBy._id === getCurrentUserId()) {
            const category = expense.category || 'other';
            categoryData[category] = (categoryData[category] || 0) + expense.amount;
        }
    });
    
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    const categories = Object.keys(categoryData);
    const amounts = Object.values(categoryData);
    const colors = categories.map(cat => categoryColors[cat] || '#FF9F40');
    
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categories.map(cat => cat.charAt(0).toUpperCase() + cat.slice(1)),
            datasets: [{
                data: amounts,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: 'rgba(255, 255, 255, 0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'white',
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = amounts.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ₹${context.parsed.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Update trend line chart
function updateTrendChart() {
    const dailyData = {};
    
    // Group expenses by date (only user's expenses)
    expenseData.forEach(expense => {
        if (expense.paidBy._id === getCurrentUserId()) {
            const date = new Date(expense.createdAt).toDateString();
            dailyData[date] = (dailyData[date] || 0) + expense.amount;
        }
    });
    
    // Create array of last N days
    const dates = [];
    const amounts = [];
    
    for (let i = currentPeriod - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        
        dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        amounts.push(dailyData[dateStr] || 0);
    }
    
    const ctx = document.getElementById('trendChart').getContext('2d');
    
    if (trendChart) {
        trendChart.destroy();
    }
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Daily Expenses',
                data: amounts,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#667eea',
                pointBorderColor: 'white',
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `₹${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        callback: function(value) {
                            return '₹' + value.toFixed(0);
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

// Update category breakdown
function updateCategoryBreakdown() {
    const categoryData = {};
    const categoryIcons = {
        food: 'fas fa-utensils',
        transport: 'fas fa-car',
        accommodation: 'fas fa-home',
        entertainment: 'fas fa-film',
        utilities: 'fas fa-bolt',
        other: 'fas fa-shopping-bag'
    };
    
    // Calculate category totals (only user's expenses)
    expenseData.forEach(expense => {
        if (expense.paidBy._id === getCurrentUserId()) {
            const category = expense.category || 'other';
            categoryData[category] = (categoryData[category] || 0) + expense.amount;
        }
    });
    
    const total = Object.values(categoryData).reduce((a, b) => a + b, 0);
    const container = document.getElementById('categoryBreakdown');
    container.innerHTML = '';
    
    if (total === 0) {
        container.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.6);">No expenses in this period</p>';
        return;
    }
    
    // Sort categories by amount
    const sortedCategories = Object.entries(categoryData)
        .sort(([,a], [,b]) => b - a);
    
    sortedCategories.forEach(([category, amount]) => {
        const percentage = ((amount / total) * 100).toFixed(1);
        
        const item = document.createElement('div');
        item.className = 'trend-item';
        item.innerHTML = `
            <div class="trend-category">
                <i class="${categoryIcons[category] || 'fas fa-shopping-bag'}" style="color: #667eea;"></i>
                <span style="color: white; text-transform: capitalize;">${category}</span>
            </div>
            <div>
                <span class="trend-amount">₹${amount.toFixed(2)}</span>
                <span class="trend-percentage" style="background: rgba(102, 126, 234, 0.2); color: #667eea;">
                    ${percentage}%
                </span>
            </div>
        `;
        
        container.appendChild(item);
    });
}

// Get current user ID
function getCurrentUserId() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user._id || user.id;
    } catch {
        return null;
    }
}

// Utility functions
function showLoading(show) {
    // Simple loading indicator
    let loader = document.getElementById('analyticsLoader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'analyticsLoader';
        loader.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            z-index: 1000;
            display: none;
        `;
        loader.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading analytics...';
        document.body.appendChild(loader);
    }
    
    loader.style.display = show ? 'block' : 'none';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ff5252' : '#00e676'};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        z-index: 1000;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 4000);
}