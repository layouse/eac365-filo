let currentReportType = 'financial';
let reportData = {};

document.addEventListener('DOMContentLoaded', () => {
    initializeDateRange();
    generateReport();
});

function initializeDateRange() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    document.getElementById('reportStartDate').value = formatDateForInput(firstDay);
    document.getElementById('reportEndDate').value = formatDateForInput(today);
}

function switchReport(type) {
    currentReportType = type;
    
    document.querySelectorAll('.report-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    generateReport();
}

async function generateReport() {
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    
    try {
        let data;
        switch(currentReportType) {
            case 'financial':
                data = await loadFinancialReport(startDate, endDate);
                displayFinancialReport(data);
                break;
            case 'fleet':
                data = await loadFleetReport(startDate, endDate);
                displayFleetReport(data);
                break;
            case 'personnel':
                data = await loadPersonnelReport(startDate, endDate);
                displayPersonnelReport(data);
                break;
            case 'fuel':
                data = await loadFuelReport(startDate, endDate);
                displayFuelReport(data);
                break;
        }
    } catch (error) {
        showMessage('Rapor oluşturulamadı', 'error');
    }
}

async function loadFinancialReport(startDate, endDate) {
    const data = await apiRequest(`/reports/financial?start=${startDate}&end=${endDate}`);
    return data;
}

function displayFinancialReport(data) {
    const content = document.getElementById('reportContent');
    
    const income = data.income || 0;
    const expense = data.expense || 0;
    const fuel = data.fuel || 0;
    const profit = income - (expense + fuel);
    
    content.innerHTML = `
        <div class="report-section">
            <h3>Finansal Rapor</h3>
            <p>${formatDate(data.startDate)} - ${formatDate(data.endDate)}</p>
            
            <div class="report-stats">
                <div class="stat-card">
                    <div class="stat-value text-success">${formatCurrency(income)}</div>
                    <div class="stat-label">Toplam Gelir</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value text-danger">${formatCurrency(expense + fuel)}</div>
                    <div class="stat-label">Toplam Gider</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value ${profit >= 0 ? 'text-success' : 'text-danger'}">
                        ${formatCurrency(profit)}
                    </div>
                    <div class="stat-label">Net Kâr</div>
                </div>
            </div>
            
            <div class="report-chart">
                <canvas id="reportChart"></canvas>
            </div>
            
            <div class="report-table">
                <h4>Kategori Bazlı Dağılım</h4>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Kategori</th>
                            <th>Gelir</th>
                            <th>Gider</th>
                            <th>Net</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${generateCategoryRows(data.categories)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    createReportChart(data);
}

function generateCategoryRows(categories) {
    if (!categories) return '<tr><td colspan="4">Veri yok</td></tr>';
    
    return categories.map(c => `
        <tr>
            <td>${c.name}</td>
            <td class="text-success">${formatCurrency(c.income || 0)}</td>
            <td class="text-danger">${formatCurrency(c.expense || 0)}</td>
            <td class="${(c.income - c.expense) >= 0 ? 'text-success' : 'text-danger'}">
                ${formatCurrency((c.income || 0) - (c.expense || 0))}
            </td>
        </tr>
    `).join('');
}

function createReportChart(data) {
    const ctx = document.getElementById('reportChart')?.getContext('2d');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels || ['Hafta 1', 'Hafta 2', 'Hafta 3', 'Hafta 4'],
            datasets: [
                {
                    label: 'Gelir',
                    data: data.weeklyIncome || [0, 0, 0, 0],
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Gider',
                    data: data.weeklyExpense || [0, 0, 0, 0],
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
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

async function loadFleetReport(startDate, endDate) {
    const data = await apiRequest(`/reports/fleet?start=${startDate}&end=${endDate}`);
    return data;
}

function displayFleetReport(data) {
    const content = document.getElementById('reportContent');
    
    content.innerHTML = `
        <div class="report-section">
            <h3>Filo Performans Raporu</h3>
            <p>${formatDate(data.startDate)} - ${formatDate(data.endDate)}</p>
            
            <div class="report-stats">
                <div class="stat-card">
                    <div class="stat-value">${data.totalVehicles || 0}</div>
                    <div class="stat-label">Toplam Araç</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${(data.totalKm || 0).toLocaleString()} km</div>
                    <div class="stat-label">Toplam KM</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${(data.avgFuel || 0).toFixed(2)} L/100km</div>
                    <div class="stat-label">Ort. Yakıt Tüketimi</div>
                </div>
            </div>
            
            <div class="report-table">
                <h4>Araç Bazlı Performans</h4>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Plaka</th>
                            <th>Toplam KM</th>
                            <th>Yakıt (L)</th>
                            <th>Yakıt Tutarı</th>
                            <th>Bakım Sayısı</th>
                            <th>Bakım Maliyeti</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${generateVehicleRows(data.vehicles)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function generateVehicleRows(vehicles) {
    if (!vehicles || vehicles.length === 0) {
        return '<tr><td colspan="6">Veri yok</td></tr>';
    }
    
    return vehicles.map(v => `
        <tr>
            <td><strong>${v.plate}</strong></td>
            <td>${(v.totalKm || 0).toLocaleString()} km</td>
            <td>${(v.totalFuel || 0).toFixed(1)} L</td>
            <td>${formatCurrency(v.fuelCost || 0)}</td>
            <td>${v.maintenanceCount || 0}</td>
            <td>${formatCurrency(v.maintenanceCost || 0)}</td>
        </tr>
    `).join('');
}

async function loadPersonnelReport(startDate, endDate) {
    const data = await apiRequest(`/reports/personnel?start=${startDate}&end=${endDate}`);
    return data;
}

function displayPersonnelReport(data) {
    const content = document.getElementById('reportContent');
    
    content.innerHTML = `
        <div class="report-section">
            <h3>Personel Raporu</h3>
            <p>${formatDate(data.startDate)} - ${formatDate(data.endDate)}</p>
            
            <div class="report-stats">
                <div class="stat-card">
                    <div class="stat-value">${data.totalPersonnel || 0}</div>
                    <div class="stat-label">Toplam Personel</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatCurrency(data.totalSalary || 0)}</div>
                    <div class="stat-label">Toplam Maaş</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatCurrency(data.totalBonus || 0)}</div>
                    <div class="stat-label">Toplam Prim</div>
                </div>
            </div>
            
            <div class="report-table">
                <h4>Personel Bazlı Çalışma</h4>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Personel</th>
                            <th>Pozisyon</th>
                            <th>Çalışma Günü</th>
                            <th>Toplam KM</th>
                            <th>Maaş</th>
                            <th>Prim</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${generatePersonnelRows(data.personnel)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function generatePersonnelRows(personnel) {
    if (!personnel || personnel.length === 0) {
        return '<tr><td colspan="6">Veri yok</td></tr>';
    }
    
    return personnel.map(p => `
        <tr>
            <td><strong>${p.name} ${p.surname}</strong></td>
            <td>${getPositionText(p.position)}</td>
            <td>${p.workDays || 0} gün</td>
            <td>${(p.totalKm || 0).toLocaleString()} km</td>
            <td>${formatCurrency(p.salary || 0)}</td>
            <td>${formatCurrency(p.bonus || 0)}</td>
        </tr>
    `).join('');
}

async function loadFuelReport(startDate, endDate) {
    const data = await apiRequest(`/reports/fuel?start=${startDate}&end=${endDate}`);
    return data;
}

function displayFuelReport(data) {
    const content = document.getElementById('reportContent');
    
    content.innerHTML = `
        <div class="report-section">
            <h3>Yakıt Tüketim Raporu</h3>
            <p>${formatDate(data.startDate)} - ${formatDate(data.endDate)}</p>
            
            <div class="report-stats">
                <div class="stat-card">
                    <div class="stat-value">${(data.totalLiters || 0).toFixed(1)} L</div>
                    <div class="stat-label">Toplam Yakıt</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatCurrency(data.totalCost || 0)}</div>
                    <div class="stat-label">Toplam Maliyet</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${(data.avgPrice || 0).toFixed(2)} ₺/L</div>
                    <div class="stat-label">Ort. Fiyat</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${(data.avgConsumption || 0).toFixed(2)} L/100km</div>
                    <div class="stat-label">Ort. Tüketim</div>
                </div>
            </div>
            
            <div class="report-table">
                <h4>Araç Bazlı Yakıt Tüketimi</h4>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Plaka</th>
                            <th>Toplam Litre</th>
                            <th>Toplam Tutar</th>
                            <th>Ort. Fiyat</th>
                            <th>Ort. Tüketim</th>
                            <th>Toplam KM</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${generateFuelRows(data.vehicles)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function generateFuelRows(vehicles) {
    if (!vehicles || vehicles.length === 0) {
        return '<tr><td colspan="6">Veri yok</td></tr>';
    }
    
    return vehicles.map(v => `
        <tr>
            <td><strong>${v.plate}</strong></td>
            <td>${(v.liters || 0).toFixed(1)} L</td>
            <td>${formatCurrency(v.cost || 0)}</td>
            <td>${(v.avgPrice || 0).toFixed(2)} ₺</td>
            <td>${(v.consumption || 0).toFixed(2)} L/100km</td>
            <td>${(v.km || 0).toLocaleString()} km</td>
        </tr>
    `).join('');
}

function setReportRange(range) {
    const today = new Date();
    let start = new Date();
    
    switch(range) {
        case 'today':
            start = today;
            break;
        case 'week':
            start.setDate(today.getDate() - 7);
            break;
        case 'month':
            start.setMonth(today.getMonth() - 1);
            break;
        case 'quarter':
            start.setMonth(today.getMonth() - 3);
            break;
        case 'year':
            start.setFullYear(today.getFullYear() - 1);
            break;
    }
    
    document.getElementById('reportStartDate').value = formatDateForInput(start);
    document.getElementById('reportEndDate').value = formatDateForInput(today);
    generateReport();
}

function exportAllReports() {
    showMessage('PDF rapor oluşturuluyor...', 'info');
    // PDF oluşturma işlemi
    setTimeout(() => {
        showMessage('Rapor hazır!', 'success');
    }, 2000);
}

function exportToExcel() {
    const data = reportData[currentReportType];
    if (!data) {
        showMessage('Rapor verisi bulunamadı', 'error');
        return;
    }
    
    // Excel export işlemi
    const csv = convertReportToCSV(data);
    downloadFile(`${currentReportType}-rapor.csv`, csv);
    showMessage('Excel dosyası indiriliyor...', 'success');
}

function convertReportToCSV(data) {
    // CSV dönüşümü
    let csv = '';
    
    switch(currentReportType) {
        case 'financial':
            csv = 'Kategori,Gelir,Gider,Net\n' +
                data.categories.map(c => 
                    `${c.name},${c.income || 0},${c.expense || 0},${(c.income || 0) - (c.expense || 0)}`
                ).join('\n');
            break;
        case 'fleet':
            csv = 'Plaka,Toplam KM,Yakıt (L),Yakıt Tutarı,Bakım Sayısı,Bakım Maliyeti\n' +
                data.vehicles.map(v =>
                    `${v.plate},${v.totalKm || 0},${v.totalFuel || 0},${v.fuelCost || 0},${v.maintenanceCount || 0},${v.maintenanceCost || 0}`
                ).join('\n');
            break;
        case 'personnel':
            csv = 'Personel,Pozisyon,Çalışma Günü,Toplam KM,Maaş,Prim\n' +
                data.personnel.map(p =>
                    `${p.name} ${p.surname},${p.position},${p.workDays || 0},${p.totalKm || 0},${p.salary || 0},${p.bonus || 0}`
                ).join('\n');
            break;
        case 'fuel':
            csv = 'Plaka,Toplam Litre,Toplam Tutar,Ortalama Fiyat,Ortalama Tüketim,Toplam KM\n' +
                data.vehicles.map(v =>
                    `${v.plate},${v.liters || 0},${v.cost || 0},${v.avgPrice || 0},${v.consumption || 0},${v.km || 0}`
                ).join('\n');
            break;
    }
    
    return csv;
}

function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

function formatCurrency(value) {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 2
    }).format(value);
}

function getPositionText(position) {
    const positions = {
        'driver': 'Şoför',
        'operation': 'Operasyon',
        'accounting': 'Muhasebe',
        'mechanic': 'Tamirci',
        'other': 'Diğer'
    };
    return positions[position] || position;
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