// =============================================
// PANEL JS - Düzeltilmiş Versiyon
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    setCurrentDate();
});

function setCurrentDate() {
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = now.toLocaleDateString('tr-TR', options);
    }
}

async function loadDashboardData() {
    try {
        // Araç istatistikleri
        const vehiclesData = await apiRequest('/vehicles/stats/summary');
        document.getElementById('totalVehicles').textContent = vehiclesData.stats?.total || 0;
        
        // Personel istatistikleri
        const personnelData = await apiRequest('/personnel/stats/summary');
        document.getElementById('totalPersonnel').textContent = personnelData.stats?.total || 0;
        
        // Finans istatistikleri
        const financeData = await apiRequest('/transactions/stats/summary');
        document.getElementById('monthlyIncome').textContent = formatCurrency(financeData.stats?.income || 0);
        document.getElementById('monthlyFuel').textContent = (financeData.stats?.fuel || 0).toFixed(1) + ' L';
        
        // Son işlemler
        await loadRecentTransactions();
        
    } catch (error) {
        console.error('Dashboard yükleme hatası:', error);
    }
}

async function loadRecentTransactions() {
    try {
        const data = await apiRequest('/transactions/recent?limit=5');
        const tbody = document.getElementById('recentTransactions');
        
        if (!data.transactions || data.transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">Henüz işlem yok</td></tr>';
            return;
        }
        
        let html = '';
        data.transactions.forEach(t => {
            html += `
                <tr>
                    <td>${formatDate(t.date)}</td>
                    <td>${t.type === 'income' ? 'Gelir' : t.type === 'expense' ? 'Gider' : 'Yakıt'}</td>
                    <td>${t.description || '-'}</td>
                    <td class="${t.type === 'income' ? 'text-success' : 'text-danger'}">
                        ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        
    } catch (error) {
        console.error('Son işlemler yüklenemedi:', error);
    }
}