// =============================================
// MUHASEBE JS - KM BİLGİLİ VERSİYON
// =============================================

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
    console.log('Muhasebe sayfası yüklendi');
    
    if (!localStorage.getItem('eac_token')) {
        window.location.href = '/login';
        return;
    }
    
    initializeButtons();
    initializeDateFilters();
    loadVehicles();
    loadPersonnel();
    loadTransactions();
});

function initializeButtons() {
    // Yeni işlem butonu
    document.getElementById('addTransactionBtn')?.addEventListener('click', () => openTransactionModal());
    
    // PDF Rapor butonu
    document.getElementById('exportPdfBtn')?.addEventListener('click', () => exportToPdf());
    
    // Filtre butonu
    document.getElementById('filterBtn')?.addEventListener('click', () => filterByDate());
    
    // Tab butonları
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const type = e.target.dataset.type;
            filterType(type);
        });
    });
    
    // Tarih butonları
    document.querySelectorAll('.quick-date-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const period = e.target.dataset.period;
            setQuickDate(period);
        });
    });
    
    // Modal kapatma
    document.getElementById('closeTransactionModal')?.addEventListener('click', closeTransactionModal);
    document.getElementById('cancelTransactionBtn')?.addEventListener('click', closeTransactionModal);
    document.getElementById('closeDetailModal')?.addEventListener('click', closeDetailModal);
    
    // İşlem tipi değişince kategorileri ve yakıt alanlarını güncelle
    document.getElementById('transactionType')?.addEventListener('change', (e) => {
        updateCategories(e.target.value);
        toggleFuelFields(e.target.value);
    });
    
    // Form submit
    document.getElementById('transactionForm')?.addEventListener('submit', saveTransaction);
}

function toggleFuelFields(type) {
    const fuelFields = document.getElementById('fuelFields');
    if (type === 'fuel') {
        fuelFields.classList.remove('hidden');
    } else {
        fuelFields.classList.add('hidden');
    }
}

function initializeDateFilters() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    document.getElementById('startDate').value = firstDay.toISOString().split('T')[0];
    document.getElementById('endDate').value = today.toISOString().split('T')[0];
    dateFilter.start = firstDay.toISOString().split('T')[0];
    dateFilter.end = today.toISOString().split('T')[0];
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
    
    let options = '<option value="">Seçiniz (Opsiyonel)</option>';
    vehicles.forEach(v => {
        options += `<option value="${v.id}">${v.plate} - ${v.brand} ${v.model}</option>`;
    });
    select.innerHTML = options;
}

function populatePersonnelSelect() {
    const select = document.getElementById('transactionPersonnel');
    if (!select) return;
    
    let options = '<option value="">Seçiniz (Opsiyonel)</option>';
    personnel.forEach(p => {
        options += `<option value="${p.id}">${p.name} ${p.surname} - ${p.position}</option>`;
    });
    select.innerHTML = options;
}

function updateCategories(type) {
    const categorySelect = document.getElementById('transactionCategory');
    let options = '';
    
    if (type === 'income') {
        options = `
            <option value="transport">Nakliye Ücreti</option>
            <option value="rental">Araç Kiralama</option>
            <option value="other_income">Diğer Gelirler</option>
        `;
    } else if (type === 'expense') {
        options = `
            <option value="maintenance">Bakım/Onarım</option>
            <option value="toll">Köprü/Otoban</option>
            <option value="insurance">Sigorta</option>
            <option value="tax">Vergi</option>
            <option value="salary">Personel Maaş</option>
            <option value="other_expense">Diğer Giderler</option>
        `;
    } else if (type === 'fuel') {
        options = `
            <option value="diesel">Motorin</option>
            <option value="gasoline">Benzin</option>
            <option value="lpg">LPG</option>
            <option value="electric">Elektrik</option>
        `;
    }
    
    categorySelect.innerHTML = options;
}

async function loadTransactions() {
    try {
        const params = new URLSearchParams({
            page: currentPage,
            limit: pageSize,
            type: currentFilter !== 'all' ? currentFilter : '',
            startDate: dateFilter.start || '',
            endDate: dateFilter.end || ''
        });
        
        const data = await apiRequest(`/transactions?${params}`);
        transactions = data.transactions || [];
        totalPages = data.totalPages || 1;
        
        updateStats();
        displayTransactions();
        updatePagination();
        updateCharts();
    } catch (error) {
        console.error('İşlem yükleme hatası:', error);
        document.getElementById('transactionsTable').innerHTML = '<tr><td colspan="8" class="text-center">İşlemler yüklenemedi</td></tr>';
    }
}

function updateStats() {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);
    const fuel = transactions.filter(t => t.type === 'fuel').reduce((s, t) => s + parseFloat(t.amount), 0);
    const totalLiters = transactions.filter(t => t.type === 'fuel').reduce((s, t) => s + (parseFloat(t.liters) || 0), 0);
    
    document.getElementById('totalIncome').textContent = formatCurrency(income);
    document.getElementById('totalExpense').textContent = formatCurrency(expense + fuel);
    document.getElementById('netProfit').textContent = formatCurrency(income - (expense + fuel));
    document.getElementById('fuelTotal').textContent = formatCurrency(fuel);
    document.getElementById('fuelLiters').textContent = totalLiters.toFixed(1) + ' L';
    
    const margin = income > 0 ? ((income - (expense + fuel)) / income * 100).toFixed(1) : 0;
    document.getElementById('profitMargin').textContent = `%${margin} marj`;
    
    document.getElementById('incomeCount').textContent = transactions.filter(t => t.type === 'income').length + ' işlem';
    document.getElementById('expenseCount').textContent = transactions.filter(t => t.type === 'expense' || t.type === 'fuel').length + ' işlem';
}

function displayTransactions() {
    const tbody = document.getElementById('transactionsTable');
    
    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">İşlem bulunamadı</td></tr>';
        return;
    }
    
    let html = '';
    transactions.forEach(t => {
        const typeClass = t.type === 'income' ? 'success' : t.type === 'expense' ? 'danger' : 'warning';
        const typeText = t.type === 'income' ? 'Gelir' : t.type === 'expense' ? 'Gider' : 'Yakıt';
        const amountClass = t.type === 'income' ? 'text-success' : 'text-danger';
        const amountPrefix = t.type === 'income' ? '+' : '-';
        
        // Yakıt işlemleri için KM bilgisini göster
        const kmInfo = t.type === 'fuel' && t.kilometer ? t.kilometer.toLocaleString() + ' km' : '-';
        
        html += `
            <tr data-id="${t.id}">
                <td>${formatDate(t.date)}</td>
                <td><span class="badge badge-${typeClass}">${typeText}</span></td>
                <td>${getCategoryText(t.category)}</td>
                <td>${t.description || '-'}</td>
                <td>${t.vehicle_plate || (t.vehicle_id ? 'Araç #' + t.vehicle_id : '-')}</td>
                <td>${kmInfo}</td>
                <td class="${amountClass}">${amountPrefix} ${formatCurrency(Math.abs(t.amount))}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon view-btn" data-id="${t.id}" title="Detay">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon edit-btn" data-id="${t.id}" title="Düzenle">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete-btn" data-id="${t.id}" title="Sil">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    // Butonlara event listener ekle
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            viewTransaction(parseInt(id));
        });
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            editTransaction(parseInt(id));
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            deleteTransaction(parseInt(id));
        });
    });
}

function getCategoryText(category) {
    const categories = {
        'transport': 'Nakliye',
        'rental': 'Kiralama',
        'other_income': 'Diğer Gelir',
        'maintenance': 'Bakım',
        'toll': 'Köprü/Otoban',
        'insurance': 'Sigorta',
        'tax': 'Vergi',
        'salary': 'Maaş',
        'other_expense': 'Diğer Gider',
        'diesel': 'Motorin',
        'gasoline': 'Benzin',
        'lpg': 'LPG',
        'electric': 'Elektrik'
    };
    return categories[category] || category;
}

function getPaymentText(type) {
    const types = {
        'cash': 'Nakit',
        'credit': 'Kredi Kartı',
        'transfer': 'Havale'
    };
    return types[type] || type;
}

function updatePagination() {
    const pagination = document.getElementById('pagination');
    let html = '';
    
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    
    pagination.innerHTML = html;
    
    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentPage = parseInt(e.target.dataset.page);
            loadTransactions();
        });
    });
}

function filterType(type) {
    currentFilter = type;
    currentPage = 1;
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
    
    if (period === 'today') {
        start = today;
    } else if (period === 'week') {
        start.setDate(today.getDate() - 7);
    } else if (period === 'month') {
        start.setMonth(today.getMonth() - 1);
    } else if (period === 'year') {
        start.setFullYear(today.getFullYear() - 1);
    } else if (period === 'all') {
        start = new Date(2020, 0, 1);
    }
    
    document.getElementById('startDate').value = start.toISOString().split('T')[0];
    document.getElementById('endDate').value = today.toISOString().split('T')[0];
    filterByDate();
}

function openTransactionModal(transaction = null) {
    const modal = document.getElementById('transactionModal');
    const title = document.getElementById('transactionModalTitle');
    const typeSelect = document.getElementById('transactionType');
    
    if (transaction) {
        title.textContent = 'İşlem Düzenle';
        document.getElementById('transactionId').value = transaction.id || '';
        document.getElementById('transactionDate').value = transaction.date || '';
        document.getElementById('transactionType').value = transaction.type || 'income';
        document.getElementById('transactionAmount').value = transaction.amount || '';
        document.getElementById('transactionDescription').value = transaction.description || '';
        document.getElementById('transactionVehicle').value = transaction.vehicle_id || '';
        document.getElementById('paymentType').value = transaction.payment_type || 'cash';
        document.getElementById('documentNo').value = transaction.document_no || '';
        
        // Yakıt alanlarını doldur
        if (transaction.type === 'fuel') {
            document.getElementById('fuelKilometer').value = transaction.kilometer || '';
            document.getElementById('fuelLiters').value = transaction.liters || '';
            document.getElementById('fuelStation').value = transaction.station || '';
        }
        
        updateCategories(transaction.type || 'income');
        toggleFuelFields(transaction.type || 'income');
    } else {
        title.textContent = 'Yeni İşlem Ekle';
        document.getElementById('transactionForm').reset();
        document.getElementById('transactionId').value = '';
        document.getElementById('transactionDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('transactionType').value = 'income';
        toggleFuelFields('income');
        updateCategories('income');
    }
    
    modal.classList.add('active');
}

function closeTransactionModal() {
    document.getElementById('transactionModal').classList.remove('active');
}

function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
        openTransactionModal(transaction);
    }
}

async function saveTransaction(e) {
    e.preventDefault();
    
    const type = document.getElementById('transactionType').value;
    const transactionData = {
        date: document.getElementById('transactionDate').value,
        type: type,
        category: document.getElementById('transactionCategory').value,
        amount: parseFloat(document.getElementById('transactionAmount').value),
        description: document.getElementById('transactionDescription').value,
        vehicle_id: document.getElementById('transactionVehicle').value || null,
        payment_type: document.getElementById('paymentType').value,
        document_no: document.getElementById('documentNo').value || null
    };
    
    // Yakıt işlemiyse ekstra alanları ekle
    if (type === 'fuel') {
        transactionData.kilometer = parseInt(document.getElementById('fuelKilometer').value) || null;
        transactionData.liters = parseFloat(document.getElementById('fuelLiters').value) || null;
        transactionData.station = document.getElementById('fuelStation').value || null;
    }
    
    const id = document.getElementById('transactionId').value;
    
    try {
        if (id) {
            await apiRequest(`/transactions/${id}`, 'PUT', transactionData);
            showMessage('İşlem güncellendi!', 'success');
        } else {
            await apiRequest('/transactions', 'POST', transactionData);
            showMessage('İşlem eklendi!', 'success');
        }
        
        closeTransactionModal();
        await loadTransactions();
    } catch (error) {
        showMessage(error.message || 'İşlem kaydedilemedi!', 'error');
    }
}

async function deleteTransaction(id) {
    if (!confirm('Bu işlemi silmek istediğinize emin misiniz?')) return;
    
    try {
        await apiRequest(`/transactions/${id}`, 'DELETE');
        showMessage('İşlem silindi!', 'success');
        await loadTransactions();
    } catch (error) {
        showMessage(error.message || 'İşlem silinemedi!', 'error');
    }
}

function viewTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    
    let extraInfo = '';
    if (transaction.type === 'fuel') {
        extraInfo = `
            <tr><td><strong>Kilometre:</strong></td><td>${transaction.kilometer ? transaction.kilometer.toLocaleString() + ' km' : '-'}</td></tr>
            <tr><td><strong>Yakıt Miktarı:</strong></td><td>${transaction.liters ? transaction.liters + ' L' : '-'}</td></tr>
            <tr><td><strong>İstasyon:</strong></td><td>${transaction.station || '-'}</td></tr>
        `;
    }
    
    const detailHtml = `
        <div class="detail-view" style="padding: 20px;">
            <h4>İşlem Detayı #${transaction.id}</h4>
            <table style="width: 100%; margin-top: 15px;">
                <tr><td><strong>Tarih:</strong></td><td>${formatDate(transaction.date)}</td></tr>
                <tr><td><strong>İşlem Tipi:</strong></td><td>${transaction.type === 'income' ? 'Gelir' : transaction.type === 'expense' ? 'Gider' : 'Yakıt'}</td></tr>
                <tr><td><strong>Kategori:</strong></td><td>${getCategoryText(transaction.category)}</td></tr>
                <tr><td><strong>Tutar:</strong></td><td class="${transaction.type === 'income' ? 'text-success' : 'text-danger'}">${transaction.type === 'income' ? '+' : '-'} ${formatCurrency(transaction.amount)}</td></tr>
                <tr><td><strong>Açıklama:</strong></td><td>${transaction.description || '-'}</td></tr>
                <tr><td><strong>Araç:</strong></td><td>${transaction.vehicle_plate || (transaction.vehicle_id ? 'Araç #' + transaction.vehicle_id : '-')}</td></tr>
                ${extraInfo}
                <tr><td><strong>Ödeme Tipi:</strong></td><td>${getPaymentText(transaction.payment_type)}</td></tr>
                <tr><td><strong>Belge No:</strong></td><td>${transaction.document_no || '-'}</td></tr>
            </table>
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
            maintainAspectRatio: false,
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
            maintainAspectRatio: false,
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

// =============================================
// PDF RAPOR FONKSİYONU
// =============================================
async function exportToPdf() {
    try {
        showMessage('PDF rapor oluşturuluyor...', 'info');
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.setTextColor(52, 152, 219);
        doc.text('EAC365 FİLO - MUHASEBE RAPORU', 14, 20);
        
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Tarih Aralığı: ${formatDate(dateFilter.start)} - ${formatDate(dateFilter.end)}`, 14, 30);
        
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('ÖZET BİLGİLER', 14, 45);
        
        doc.setFontSize(10);
        doc.text(`Toplam Gelir: ${document.getElementById('totalIncome').textContent}`, 20, 55);
        doc.text(`Toplam Gider: ${document.getElementById('totalExpense').textContent}`, 20, 62);
        doc.text(`Net Kâr: ${document.getElementById('netProfit').textContent}`, 20, 69);
        doc.text(`Yakıt Gideri: ${document.getElementById('fuelTotal').textContent}`, 20, 76);
        
        doc.setFontSize(12);
        doc.text('İŞLEM LİSTESİ', 14, 95);
        
        const tableColumn = ["Tarih", "Tip", "Kategori", "Açıklama", "Araç", "KM", "Tutar"];
        const tableRows = [];
        
        transactions.slice(0, 20).forEach(t => {
            const typeText = t.type === 'income' ? 'Gelir' : t.type === 'expense' ? 'Gider' : 'Yakıt';
            const kmInfo = t.type === 'fuel' && t.kilometer ? t.kilometer.toLocaleString() + ' km' : '-';
            const rowData = [
                formatDate(t.date),
                typeText,
                getCategoryText(t.category),
                t.description || '-',
                t.vehicle_plate || '-',
                kmInfo,
                formatCurrency(t.amount)
            ];
            tableRows.push(rowData);
        });
        
        doc.autoTable({
            startY: 100,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [52, 152, 219] }
        });
        
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Oluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}`, 14, doc.internal.pageSize.height - 10);
            doc.text(`Sayfa ${i} / ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
        }
        
        doc.save(`muhasebe_raporu_${new Date().toISOString().split('T')[0]}.pdf`);
        
        showMessage('PDF rapor indiriliyor!', 'success');
        
    } catch (error) {
        console.error('PDF oluşturma hatası:', error);
        showMessage('PDF oluşturulamadı!', 'error');
    }
}