let transactions = [];
let vehicles = [];
let personnel = [];
let currentPage = 1;
let pageSize = 20;
let totalPages = 1;
let currentFilter = 'all';
let dateFilter = { start: null, end: null };
let charts = {};

document.addEventListener('DOMContentLoaded', () => {
    initializeDateFilters();
    loadVehicles();
    loadPersonnel();
    loadTransactions();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('transactionForm')?.addEventListener('submit', saveTransaction);
}

function initializeDateFilters() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    document.getElementById('startDate').value = formatDateForInput(firstDay);
    document.getElementById('endDate').value = formatDateForInput(today);
}

function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

async function loadVehicles() {
    try {
        const data = await apiRequest('/vehicles');
        vehicles = data.vehicles || [];
        populateVehicleSelect();
    } catch (error) {
        console.error('Araçlar yüklenemedi:', error);
    }
}

async function loadPersonnel() {
    try {
        const data = await apiRequest('/personnel');
        personnel = data.personnel || [];
        populatePersonnelSelect();
    } catch (error) {
        console.error('Personel yüklenemedi:', error);
    }
}

function populateVehicleSelect() {
    const select = document.getElementById('transactionVehicle');
    if (!select) return;
    
    select.innerHTML = '<option value="">Seçiniz (Opsiyonel)</option>' +
        vehicles.map(v => `<option value="${v.id}">${v.plate} - ${v.brand} ${v.model}</option>`).join('');
}

function populatePersonnelSelect() {
    const select = document.getElementById('transactionPersonnel');
    if (!select) return;
    
    select.innerHTML = '<option value="">Seçiniz (Opsiyonel)</option>' +
        personnel.map(p => `<option value="${p.id}">${p.name} ${p.surname} - ${p.position}</option>`).join('');
}

function handleTypeChange() {
    const type = document.getElementById('transactionType').value;
    const vehicleGroup = document.getElementById('vehicleSelectGroup');
    const personnelGroup = document.getElementById('personnelSelectGroup');
    const categorySelect = document.getElementById('transactionCategory');
    
    // Kategorileri güncelle
    updateCategories(type);
    
    // Araç/Personel seçimini göster/gizle
    if (type === 'fuel') {
        vehicleGroup.style.display = 'block';
        personnelGroup.style.display = 'none';
    } else if (type === 'expense') {
        vehicleGroup.style.display = 'block';
        personnelGroup.style.display = 'block';
    } else {
        vehicleGroup.style.display = 'block';
        personnelGroup.style.display = 'none';
    }
}

function updateCategories(type) {
    const categories = {
        income: [
            { value: 'transport', label: 'Nakliye Ücreti' },
            { value: 'rental', label: 'Araç Kiralama' },
            { value: 'other_income', label: 'Diğer Gelirler' }
        ],
        expense: [
            { value: 'maintenance', label: 'Bakım/Onarım' },
            { value: 'toll', label: 'Köprü/Otoban' },
            { value: 'parking', label: 'Park Ücreti' },
            { value: 'insurance', label: 'Sigorta' },
            { value: 'tax', label: 'Vergi' },
            { value: 'salary', label: 'Personel Maaş' },
            { value: 'other_expense', label: 'Diğer Giderler' }
        ],
        fuel: [
            { value: 'diesel', label: 'Motorin' },
            { value: 'gasoline', label: 'Benzin' },
            { value: 'lpg', label: 'LPG' }
        ]
    };
    
    const select = document.getElementById('transactionCategory');
    select.innerHTML = categories[type]?.map(c => 
        `<option value="${c.value}">${c.label}</option>`
    ).join('') || '<option value="other">Diğer</option>';
}

async function loadTransactions() {
    try {
        const params = new URLSearchParams({
            page: currentPage,
            limit: pageSize,
            type: currentFilter !== 'all' ? currentFilter : '',
            startDate: dateFilter.start,
            endDate: dateFilter.end
        });
        
        const data = await apiRequest(`/transactions?${params}`);
        transactions = data.transactions || [];
        totalPages = data.totalPages || 1;
        
        updateStats();
        displayTransactions();
        updatePagination();
        updateCharts();
    } catch (error) {
        showMessage('İşlemler yüklenirken hata oluştu', 'error');
    }
}

function updateStats() {
    const income = transactions.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const expense = transactions.filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const fuel = transactions.filter(t => t.type === 'fuel')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const fuelLiters = transactions.filter(t => t.type === 'fuel')
        .reduce((sum, t) => sum + parseFloat(t.liters || 0), 0);
    
    document.getElementById('totalIncome').textContent = formatCurrency(income);
    document.getElementById('totalExpense').textContent = formatCurrency(expense + fuel);
    document.getElementById('netProfit').textContent = formatCurrency(income - (expense + fuel));
    document.getElementById('fuelTotal').textContent = formatCurrency(fuel);
    document.getElementById('fuelLiters').textContent = `${fuelLiters.toFixed(1)} L`;
    
    document.getElementById('incomeCount').textContent = 
        `${transactions.filter(t => t.type === 'income').length} işlem`;
    document.getElementById('expenseCount').textContent = 
        `${transactions.filter(t => t.type === 'expense' || t.type === 'fuel').length} işlem`;
    
    const margin = income > 0 ? ((income - (expense + fuel)) / income * 100).toFixed(1) : 0;
    document.getElementById('profitMargin').textContent = `%${margin} marj`;
}

function displayTransactions() {
    const tbody = document.getElementById('transactionsTable');
    
    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">İşlem bulunamadı</td></tr>';
        return;
    }
    
    let html = '';
    transactions.forEach(t => {
        const typeClass = t.type === 'income' ? 'success' : 
                         t.type === 'expense' ? 'danger' : 'warning';
        const typeText = t.type === 'income' ? 'Gelir' : 
                        t.type === 'expense' ? 'Gider' : 'Yakıt';
        const amountClass = t.type === 'income' ? 'text-success' : 'text-danger';
        const amountPrefix = t.type === 'income' ? '+' : '-';
        
        html += `
            <tr>
                <td>${formatDate(t.date)}</td>
                <td><span class="badge badge-${typeClass}">${typeText}</span></td>
                <td>${getCategoryText(t.category)}</td>
                <td>${t.description || '-'}</td>
                <td>${t.vehicle_plate || t.personnel_name || '-'}</td>
                <td class="${amountClass}">${amountPrefix} ${formatCurrency(Math.abs(t.amount))}</td>
                <td>${getPaymentText(t.payment_type)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="viewTransaction(${t.id})" title="Detay">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" onclick="editTransaction(${t.id})" title="Düzenle">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete" onclick="deleteTransaction(${t.id})" title="Sil">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function getCategoryText(category) {
    const categories = {
        'transport': 'Nakliye',
        'rental': 'Kiralama',
        'maintenance': 'Bakım',
        'toll': 'Köprü/Otoban',
        'parking': 'Park',
        'insurance': 'Sigorta',
        'tax': 'Vergi',
        'salary': 'Maaş',
        'diesel': 'Motorin',
        'gasoline': 'Benzin',
        'lpg': 'LPG',
        'other': 'Diğer'
    };
    return categories[category] || category;
}

function getPaymentText(type) {
    const types = {
        'cash': 'Nakit',
        'credit': 'Kredi Kartı',
        'transfer': 'Havale',
        'check': 'Çek'
    };
    return types[type] || type;
}

function updatePagination() {
    const pagination = document.getElementById('pagination');
    let html = '';
    
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" 
                        onclick="goToPage(${i})">${i}</button>`;
    }
    
    pagination.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    loadTransactions();
}

function filterType(type) {
    currentFilter = type;
    currentPage = 1;
    
    // Tab butonlarını güncelle
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    loadTransactions();
}

function filterByDate() {
    dateFilter.start = document.getElementById('startDate').value;
    dateFilter.end = document.getElementById('endDate').value;
    currentPage = 1;
    loadTransactions();
}

function setQuickDate(period) {
    const today = new Date();
    let start = new Date();
    
    switch(period) {
        case 'today':
            start = today;
            break;
        case 'week':
            start.setDate(today.getDate() - 7);
            break;
        case 'month':
            start.setMonth(today.getMonth() - 1);
            break;
        case 'year':
            start.setFullYear(today.getFullYear() - 1);
            break;
    }
    
    document.getElementById('startDate').value = formatDateForInput(start);
    document.getElementById('endDate').value = formatDateForInput(today);
    filterByDate();
}

function openTransactionModal(transaction = null) {
    if (transaction) {
        document.getElementById('transactionModalTitle').textContent = 'İşlem Düzenle';
        document.getElementById('transactionId').value = transaction.id;
        document.getElementById('transactionDate').value = transaction.date;
        document.getElementById('transactionType').value = transaction.type;
        document.getElementById('transactionCategory').value = transaction.category;
        document.getElementById('transactionAmount').value = transaction.amount;
        document.getElementById('transactionVehicle').value = transaction.vehicle_id || '';
        document.getElementById('transactionPersonnel').value = transaction.personnel_id || '';
        document.getElementById('transactionDescription').value = transaction.description || '';
        document.getElementById('paymentType').value = transaction.payment_type || 'cash';
        document.getElementById('documentNo').value = transaction.document_no || '';
    } else {
        document.getElementById('transactionModalTitle').textContent = 'Yeni İşlem Ekle';
        document.getElementById('transactionForm').reset();
        document.getElementById('transactionId').value = '';
        document.getElementById('transactionDate').value = formatDateForInput(new Date());
        document.getElementById('transactionType').value = 'income';
    }
    
    handleTypeChange();
    document.getElementById('transactionModal').classList.add('active');
}

function closeTransactionModal() {
    document.getElementById('transactionModal').classList.remove('active');
}

async function saveTransaction(e) {
    e.preventDefault();
    
    const transactionData = {
        date: document.getElementById('transactionDate').value,
        type: document.getElementById('transactionType').value,
        category: document.getElementById('transactionCategory').value,
        amount: parseFloat(document.getElementById('transactionAmount').value),
        vehicle_id: document.getElementById('transactionVehicle').value || null,
        personnel_id: document.getElementById('transactionPersonnel').value || null,
        description: document.getElementById('transactionDescription').value || null,
        payment_type: document.getElementById('paymentType').value,
        document_no: document.getElementById('documentNo').value || null
    };
    
    const id = document.getElementById('transactionId').value;
    
    try {
        if (id) {
            await apiRequest(`/transactions/${id}`, 'PUT', transactionData);
            showMessage('İşlem güncellendi', 'success');
        } else {
            await apiRequest('/transactions', 'POST', transactionData);
            showMessage('İşlem eklendi', 'success');
        }
        
        closeTransactionModal();
        loadTransactions();
    } catch (error) {
        showMessage('İşlem kaydedilemedi', 'error');
    }
}

function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (transaction) openTransactionModal(transaction);
}

async function deleteTransaction(id) {
    if (!confirm('Bu işlemi silmek istediğinize emin misiniz?')) return;
    
    try {
        await apiRequest(`/transactions/${id}`, 'DELETE');
        showMessage('İşlem silindi', 'success');
        loadTransactions();
    } catch (error) {
        showMessage('İşlem silinemedi', 'error');
    }
}

function viewTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    
    const detailHtml = `
        <div class="detail-view">
            <div class="detail-row">
                <div class="detail-label">İşlem No:</div>
                <div class="detail-value">#${transaction.id}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Tarih:</div>
                <div class="detail-value">${formatDate(transaction.date)}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">İşlem Tipi:</div>
                <div class="detail-value">
                    <span class="badge badge-${transaction.type === 'income' ? 'success' : 'danger'}">
                        ${transaction.type === 'income' ? 'Gelir' : 'Gider'}
                    </span>
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Kategori:</div>
                <div class="detail-value">${getCategoryText(transaction.category)}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Tutar:</div>
                <div class="detail-value ${transaction.type === 'income' ? 'text-success' : 'text-danger'}">
                    ${transaction.type === 'income' ? '+' : '-'} ${formatCurrency(transaction.amount)}
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Araç:</div>
                <div class="detail-value">${transaction.vehicle_plate || '-'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Personel:</div>
                <div class="detail-value">${transaction.personnel_name || '-'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Açıklama:</div>
                <div class="detail-value">${transaction.description || '-'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Ödeme Tipi:</div>
                <div class="detail-value">${getPaymentText(transaction.payment_type)}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Belge No:</div>
                <div class="detail-value">${transaction.document_no || '-'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Oluşturulma:</div>
                <div class="detail-value">${new Date(transaction.created_at).toLocaleString('tr-TR')}</div>
            </div>
        </div>
    `;
    
    document.getElementById('transactionDetail').innerHTML = detailHtml;
    document.getElementById('detailModal').classList.add('active');
}

function closeDetailModal() {
    document.getElementById('detailModal').classList.remove('active');
}

function updateCharts() {
    updatePieChart();
    updateMonthlyChart();
}

function updatePieChart() {
    const ctx = document.getElementById('pieChart')?.getContext('2d');
    if (!ctx) return;
    
    // Kategorilere göre grupla
    const categories = {};
    transactions.forEach(t => {
        const cat = getCategoryText(t.category);
        categories[cat] = (categories[cat] || 0) + Math.abs(t.amount);
    });
    
    if (charts.pie) charts.pie.destroy();
    
    charts.pie = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: [
                    '#3498db', '#2ecc71', '#e74c3c', '#f39c12', 
                    '#9b59b6', '#1abc9c', '#e67e22', '#34495e'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function updateMonthlyChart() {
    const ctx = document.getElementById('monthlyChart')?.getContext('2d');
    if (!ctx) return;
    
    // Son 6 ay
    const months = [];
    const incomeData = [];
    const expenseData = [];
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        months.push(date.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }));
        
        const monthTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getMonth() === date.getMonth() && 
                   tDate.getFullYear() === date.getFullYear();
        });
        
        incomeData.push(monthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0));
        
        expenseData.push(monthTransactions
            .filter(t => t.type === 'expense' || t.type === 'fuel')
            .reduce((sum, t) => sum + t.amount, 0));
    }
    
    if (charts.monthly) charts.monthly.destroy();
    
    charts.monthly = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Gelir',
                    data: incomeData,
                    backgroundColor: '#2ecc71'
                },
                {
                    label: 'Gider',
                    data: expenseData,
                    backgroundColor: '#e74c3c'
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => formatCurrency(value)
                    }
                }
            }
        }
    });
}

function exportTransactions() {
    const data = transactions.map(t => ({
        Tarih: t.date,
        Tip: t.type === 'income' ? 'Gelir' : t.type === 'expense' ? 'Gider' : 'Yakıt',
        Kategori: getCategoryText(t.category),
        Açıklama: t.description,
        Araç: t.vehicle_plate,
        Personel: t.personnel_name,
        Tutar: t.amount,
        'Ödeme Tipi': getPaymentText(t.payment_type),
        'Belge No': t.document_no
    }));
    
    const csv = convertToCSV(data);
    downloadFile('islemler.csv', csv);
}

function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const rows = data.map(obj => headers.map(h => obj[h]).join(','));
    
    return [headers.join(','), ...rows].join('\n');
}

function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}