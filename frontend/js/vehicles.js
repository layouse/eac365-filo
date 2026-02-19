// =============================================
// ARAÇ YÖNETİMİ - vehicles.js
// =============================================

let vehicles = [];
let currentVehicleId = null;

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    console.log('Araç sayfası yüklendi');
    loadVehicles();
    setupEventListeners();
    checkUrlParams();
});

// Event listener'ları kur
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const fuelFilter = document.getElementById('fuelFilter');
    
    if (searchInput) searchInput.addEventListener('input', filterVehicles);
    if (statusFilter) statusFilter.addEventListener('change', filterVehicles);
    if (fuelFilter) fuelFilter.addEventListener('change', filterVehicles);
    
    const vehicleForm = document.getElementById('vehicleForm');
    const fuelForm = document.getElementById('fuelForm');
    const maintenanceForm = document.getElementById('maintenanceForm');
    
    if (vehicleForm) vehicleForm.addEventListener('submit', saveVehicle);
    if (fuelForm) fuelForm.addEventListener('submit', saveFuelRecord);
    if (maintenanceForm) maintenanceForm.addEventListener('submit', saveMaintenance);
}

// URL parametrelerini kontrol et
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'add') {
        setTimeout(() => openVehicleModal(), 500);
    }
}

// =============================================
// ARAÇ İŞLEMLERİ
// =============================================

// Araçları yükle
async function loadVehicles() {
    showLoading(true);
    
    try {
        const data = await apiRequest('/vehicles');
        vehicles = data.vehicles || [];
        updateStats();
        displayVehicles();
        showMessage(`${vehicles.length} araç yüklendi`, 'success');
    } catch (error) {
        console.error('Araç yükleme hatası:', error);
        showMessage('Araçlar yüklenirken hata oluştu!', 'error');
        
        // Hata durumunda grid'i temizle
        document.getElementById('vehiclesGrid').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Yükleme Hatası</h3>
                <p>Araçlar yüklenirken bir sorun oluştu.</p>
                <button class="btn btn-primary" onclick="loadVehicles()">
                    <i class="fas fa-sync-alt"></i> Tekrar Dene
                </button>
            </div>
        `;
    } finally {
        showLoading(false);
    }
}

// Loading göster/gizle
function showLoading(show) {
    const grid = document.getElementById('vehiclesGrid');
    if (show) {
        grid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin fa-3x"></i>
                <p>Araçlar yükleniyor...</p>
            </div>
        `;
    }
}

// Yenile butonu
function refreshVehicles() {
    loadVehicles();
    showMessage('Araçlar yenileniyor...', 'info');
}

// İstatistikleri güncelle
function updateStats() {
    const total = vehicles.length;
    const active = vehicles.filter(v => v.status === 'active').length;
    const maintenance = vehicles.filter(v => v.status === 'maintenance').length;
    const totalKm = vehicles.reduce((sum, v) => sum + (parseInt(v.kilometer) || 0), 0);
    
    document.getElementById('totalVehicleCount').textContent = total;
    document.getElementById('activeVehicleCount').textContent = active;
    document.getElementById('maintenanceCount').textContent = maintenance;
    document.getElementById('totalKmCount').textContent = `${totalKm.toLocaleString()} km`;
    
    // Özet metni güncelle
    document.getElementById('fleetSummary').innerHTML = `
        <i class="fas fa-check-circle" style="color: var(--success);"></i> 
        ${active} aktif, ${maintenance} bakımda, ${total - active - maintenance} pasif
    `;
}

// Araçları göster
function displayVehicles() {
    const grid = document.getElementById('vehiclesGrid');
    const filtered = getFilteredVehicles();
    
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-truck"></i>
                <h3>Araç bulunamadı</h3>
                <p>Aramanıza uygun araç bulunmuyor.</p>
                <button class="btn btn-primary" onclick="openVehicleModal()">
                    <i class="fas fa-plus"></i> Yeni Araç Ekle
                </button>
            </div>
        `;
        return;
    }
    
    let html = '';
    filtered.forEach(v => {
        const statusClass = v.status === 'active' ? 'success' : 
                           v.status === 'maintenance' ? 'warning' : 'danger';
        const statusText = v.status === 'active' ? 'Aktif' : 
                          v.status === 'maintenance' ? 'Bakımda' : 'Pasif';
        
        html += `
            <div class="vehicle-card" data-id="${v.id}">
                <div class="vehicle-card-header">
                    <div class="vehicle-plate">${v.plate || 'PLAKA YOK'}</div>
                    <div class="vehicle-status">
                        <span class="badge badge-${statusClass}">${escapeHtml(statusText)}</span>
                    </div>
                </div>
                
                <div class="vehicle-card-body">
                    <div class="vehicle-info-grid">
                        <div class="info-item">
                            <span class="info-label">Marka</span>
                            <span class="info-value">${escapeHtml(String(v.brand || "-"))}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Model</span>
                            <span class="info-value">${escapeHtml(String(v.model || "-"))}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Yıl</span>
                            <span class="info-value">${escapeHtml(String(v.year || "-"))}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Yakıt</span>
                            <span class="info-value">${escapeHtml(getFuelText(v.fuel_type))}</span>
                        </div>
                    </div>
                    
                    <div class="vehicle-stats">
                        <div class="stat" title="Kilometre">
                            <i class="fas fa-tachometer-alt"></i>
                            <span>${(v.kilometer || 0).toLocaleString()} km</span>
                        </div>
                        <div class="stat" title="Bu Ay Yakıt">
                            <i class="fas fa-gas-pump"></i>
                            <span>${(v.monthly_fuel || 0).toFixed(1)} L</span>
                        </div>
                        <div class="stat" title="Bu Ay Bakım">
                            <i class="fas fa-wrench"></i>
                            <span>${(v.monthly_maintenance || 0).toFixed(0)} ₺</span>
                        </div>
                    </div>
                </div>
                
                <div class="vehicle-card-footer">
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="viewVehicleDetails(${parseInt(v.id)})" title="Detaylar">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" onclick="editVehicle(${parseInt(v.id)})" title="Düzenle">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="openFuelModal(${parseInt(v.id)})" title="Yakıt Ekle">
                            <i class="fas fa-gas-pump"></i>
                        </button>
                        <button class="btn-icon" onclick="openMaintenanceModal(${parseInt(v.id)})" title="Bakım Ekle">
                            <i class="fas fa-wrench"></i>
                        </button>
                        <button class="btn-icon delete" onclick="deleteVehicle(${parseInt(v.id)})" title="Sil">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    grid.innerHTML = html;
}

// Yakıt tipi metni
function getFuelText(type) {
    const fuels = {
        'diesel': 'Motorin',
        'gasoline': 'Benzin',
        'lpg': 'LPG',
        'electric': 'Elektrik'
    };
    return fuels[type] || type || '-';
}

// Filtrelenmiş araçları getir
function getFilteredVehicles() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const fuelFilter = document.getElementById('fuelFilter')?.value || '';
    
    return vehicles.filter(v => {
        // Arama filtresi
        const matchesSearch = !searchTerm || 
            (v.plate && v.plate.toLowerCase().includes(searchTerm)) ||
            (v.brand && v.brand.toLowerCase().includes(searchTerm)) ||
            (v.model && v.model.toLowerCase().includes(searchTerm));
        
        // Durum filtresi
        const matchesStatus = !statusFilter || v.status === statusFilter;
        
        // Yakıt filtresi
        const matchesFuel = !fuelFilter || v.fuel_type === fuelFilter;
        
        return matchesSearch && matchesStatus && matchesFuel;
    });
}

// Filtreleri uygula
function filterVehicles() {
    displayVehicles();
}

// =============================================
// MODAL İŞLEMLERİ
// =============================================

// Araç modalını aç
function openVehicleModal(vehicle = null) {
    const modal = document.getElementById('vehicleModal');
    const form = document.getElementById('vehicleForm');
    const title = document.getElementById('modalTitle');
    
    if (vehicle) {
        // Düzenleme modu
        title.textContent = 'Araç Düzenle';
        document.getElementById('vehicleId').value = vehicle.id || '';
        document.getElementById('plate').value = vehicle.plate || '';
        document.getElementById('brand').value = vehicle.brand || '';
        document.getElementById('model').value = vehicle.model || '';
        document.getElementById('year').value = vehicle.year || '';
        document.getElementById('fuelType').value = vehicle.fuel_type || 'diesel';
        document.getElementById('kilometer').value = vehicle.kilometer || '';
        document.getElementById('status').value = vehicle.status || 'active';
        document.getElementById('inspectionDate').value = vehicle.inspection_date || '';
        document.getElementById('notes').value = vehicle.notes || '';
        currentVehicleId = vehicle.id;
    } else {
        // Yeni ekleme modu
        title.textContent = 'Yeni Araç Ekle';
        form.reset();
        document.getElementById('vehicleId').value = '';
        document.getElementById('status').value = 'active';
        document.getElementById('fuelType').value = 'diesel';
        currentVehicleId = null;
    }
    
    modal.classList.add('active');
}

// Araç modalını kapat
function closeVehicleModal() {
    document.getElementById('vehicleModal').classList.remove('active');
    currentVehicleId = null;
}

// Aracı düzenle
function editVehicle(id) {
    const vehicle = vehicles.find(v => v.id === id);
    if (vehicle) {
        openVehicleModal(vehicle);
    } else {
        showMessage('Araç bulunamadı!', 'error');
    }
}

// Araç kaydet
async function saveVehicle(e) {
    e.preventDefault();
    
    const vehicleData = {
        plate: document.getElementById('plate').value.trim(),
        brand: document.getElementById('brand').value.trim() || null,
        model: document.getElementById('model').value.trim() || null,
        year: parseInt(document.getElementById('year').value) || null,
        fuel_type: document.getElementById('fuelType').value,
        kilometer: parseInt(document.getElementById('kilometer').value) || 0,
        status: document.getElementById('status').value,
        inspection_date: document.getElementById('inspectionDate').value || null,
        notes: document.getElementById('notes').value.trim() || null
    };
    
    // Validasyon
    if (!vehicleData.plate) {
        showMessage('Plaka zorunludur!', 'error');
        return;
    }
    
    const id = document.getElementById('vehicleId').value;
    
    try {
        let response;
        if (id) {
            response = await apiRequest(`/vehicles/${id}`, 'PUT', vehicleData);
            showMessage('Araç güncellendi', 'success');
        } else {
            response = await apiRequest('/vehicles', 'POST', vehicleData);
            showMessage('Araç eklendi', 'success');
        }
        
        closeVehicleModal();
        await loadVehicles(); // Listeyi yenile
    } catch (error) {
        console.error('Araç kayıt hatası:', error);
        showMessage(error.message || 'Araç kaydedilemedi!', 'error');
    }
}

// Araç sil
async function deleteVehicle(id) {
    if (!confirm('Bu aracı silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) {
        return;
    }
    
    try {
        await apiRequest(`/vehicles/${id}`, 'DELETE');
        showMessage('Araç silindi', 'success');
        await loadVehicles(); // Listeyi yenile
    } catch (error) {
        console.error('Araç silme hatası:', error);
        showMessage(error.message || 'Araç silinemedi!', 'error');
    }
}

// =============================================
// YAKIT İŞLEMLERİ
// =============================================

// Yakıt modalını aç
function openFuelModal(vehicleId) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
        showMessage('Araç bulunamadı!', 'error');
        return;
    }
    
    document.getElementById('fuelVehicleId').value = vehicleId;
    document.getElementById('fuelDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('fuelForm').reset();
    document.getElementById('fuelModal').classList.add('active');
}

// Yakıt modalını kapat
function closeFuelModal() {
    document.getElementById('fuelModal').classList.remove('active');
}

// Yakıt kaydını kaydet
async function saveFuelRecord(e) {
    e.preventDefault();
    
    const liters = parseFloat(document.getElementById('liters').value);
    const price = parseFloat(document.getElementById('pricePerLiter').value);
    
    if (liters <= 0 || price <= 0) {
        showMessage('Litre ve fiyat 0\'dan büyük olmalıdır!', 'error');
        return;
    }
    
    const fuelData = {
        vehicle_id: parseInt(document.getElementById('fuelVehicleId').value),
        date: document.getElementById('fuelDate').value,
        liters: liters,
        price_per_liter: price,
        kilometer: parseInt(document.getElementById('fuelKm').value) || null,
        station: document.getElementById('station').value.trim() || null
    };
    
    try {
        // Yakıt kaydını ekle
        await apiRequest('/fuel', 'POST', fuelData);
        
        // Ayrıca muhasebeye işle (yakıt gideri)
        await apiRequest('/transactions', 'POST', {
            date: fuelData.date,
            type: 'fuel',
            category: 'fuel',
            amount: liters * price,
            vehicle_id: fuelData.vehicle_id,
            description: `${fuelData.station || 'Yakıt'} - ${liters} L`,
            payment_type: 'cash'
        });
        
        showMessage('Yakıt kaydı eklendi', 'success');
        closeFuelModal();
        await loadVehicles(); // Listeyi yenile
    } catch (error) {
        console.error('Yakıt kayıt hatası:', error);
        showMessage(error.message || 'Yakıt kaydı eklenemedi!', 'error');
    }
}

// =============================================
// BAKIM İŞLEMLERİ
// =============================================

// Bakım modalını aç
function openMaintenanceModal(vehicleId) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
        showMessage('Araç bulunamadı!', 'error');
        return;
    }
    
    document.getElementById('maintenanceVehicleId').value = vehicleId;
    document.getElementById('maintenanceDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('maintenanceForm').reset();
    document.getElementById('maintenanceModal').classList.add('active');
}

// Bakım modalını kapat
function closeMaintenanceModal() {
    document.getElementById('maintenanceModal').classList.remove('active');
}

// Bakım kaydını kaydet
async function saveMaintenance(e) {
    e.preventDefault();
    
    const cost = parseFloat(document.getElementById('maintenanceCost').value);
    
    if (cost <= 0) {
        showMessage('Maliyet 0\'dan büyük olmalıdır!', 'error');
        return;
    }
    
    const maintenanceData = {
        vehicle_id: parseInt(document.getElementById('maintenanceVehicleId').value),
        date: document.getElementById('maintenanceDate').value,
        type: document.getElementById('maintenanceType').value,
        cost: cost,
        kilometer: parseInt(document.getElementById('maintenanceKm').value) || null,
        notes: document.getElementById('maintenanceNotes').value.trim() || null
    };
    
    try {
        // Bakım kaydını ekle
        await apiRequest('/maintenance', 'POST', maintenanceData);
        
        // Ayrıca muhasebeye işle (bakım gideri)
        await apiRequest('/transactions', 'POST', {
            date: maintenanceData.date,
            type: 'expense',
            category: 'maintenance',
            amount: maintenanceData.cost,
            vehicle_id: maintenanceData.vehicle_id,
            description: `Bakım - ${maintenanceData.type}`,
            payment_type: 'cash'
        });
        
        // Aracın durumunu güncelle (bakıma al)
        if (maintenanceData.type !== 'periodic') {
            await apiRequest(`/vehicles/${maintenanceData.vehicle_id}/status`, 'PATCH', {
                status: 'maintenance'
            });
        }
        
        showMessage('Bakım kaydı eklendi', 'success');
        closeMaintenanceModal();
        await loadVehicles(); // Listeyi yenile
    } catch (error) {
        console.error('Bakım kayıt hatası:', error);
        showMessage(error.message || 'Bakım kaydı eklenemedi!', 'error');
    }
}

// =============================================
// DETAY VE DIŞA AKTARMA
// =============================================

// Araç detaylarını göster
async function viewVehicleDetails(id) {
    try {
        const data = await apiRequest(`/vehicles/${id}`);
        const vehicle = data.vehicle;
        
        if (!vehicle) {
            showMessage('Araç detayları alınamadı!', 'error');
            return;
        }
        
        const detailHtml = `
            <div class="detail-view">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <h4>Genel Bilgiler</h4>
                        <table class="detail-table">
                            <tr><td>Plaka:</td><td><strong>${vehicle.plate}</strong></td></tr>
                            <tr><td>Marka:</td><td>${vehicle.brand || '-'}</td></tr>
                            <tr><td>Model:</td><td>${vehicle.model || '-'}</td></tr>
                            <tr><td>Yıl:</td><td>${vehicle.year || '-'}</td></tr>
                            <tr><td>Yakıt:</td><td>${getFuelText(vehicle.fuel_type)}</td></tr>
                            <tr><td>Kilometre:</td><td>${(vehicle.kilometer || 0).toLocaleString()} km</td></tr>
                            <tr><td>Durum:</td>
                                <td>
                                    <span class="badge badge-${vehicle.status === 'active' ? 'success' : 'warning'}">
                                        ${vehicle.status === 'active' ? 'Aktif' : 'Bakımda'}
                                    </span>
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <div>
                        <h4>İstatistikler</h4>
                        <table class="detail-table">
                            <tr><td>Toplam Yakıt:</td><td>${(vehicle.total_fuel_liters || 0).toFixed(1)} L</td></tr>
                            <tr><td>Toplam Yakıt Gideri:</td><td>${formatCurrency(vehicle.total_fuel_cost || 0)}</td></tr>
                            <tr><td>Toplam Bakım:</td><td>${vehicle.maintenance_count || 0} kez</td></tr>
                            <tr><td>Toplam Bakım Gideri:</td><td>${formatCurrency(vehicle.total_maintenance_cost || 0)}</td></tr>
                            <tr><td>Son Bakım:</td><td>${vehicle.last_maintenance || '-'}</td></tr>
                            <tr><td>Muayene Tarihi:</td><td>${vehicle.inspection_date || '-'}</td></tr>
                        </table>
                    </div>
                </div>
                
                ${vehicle.notes ? `
                <div style="margin-top: 20px;">
                    <h4>Notlar</h4>
                    <p>${vehicle.notes}</p>
                </div>
                ` : ''}
                
                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                    <button class="btn btn-primary" onclick="editVehicle(${vehicle.id}); closeDetailModal();">
                        <i class="fas fa-edit"></i> Düzenle
                    </button>
                    <button class="btn btn-secondary" onclick="closeDetailModal()">
                        <i class="fas fa-times"></i> Kapat
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('vehicleDetail').innerHTML = detailHtml;
        document.getElementById('detailModal').classList.add('active');
        
    } catch (error) {
        console.error('Detay yükleme hatası:', error);
        showMessage('Detaylar yüklenirken hata oluştu!', 'error');
    }
}

// Detay modalını kapat
function closeDetailModal() {
    document.getElementById('detailModal').classList.remove('active');
}

// Excel'e aktar
function exportVehicles() {
    try {
        const data = getFilteredVehicles();
        
        if (data.length === 0) {
            showMessage('Aktarılacak araç bulunamadı!', 'warning');
            return;
        }
        
        // CSV başlıkları
        const headers = ['Plaka', 'Marka', 'Model', 'Yıl', 'Yakıt', 'Kilometre', 'Durum', 'Muayene', 'Notlar'];
        
        // Satırları oluştur
        const rows = data.map(v => [
            v.plate,
            v.brand || '',
            v.model || '',
            v.year || '',
            getFuelText(v.fuel_type),
            v.kilometer || 0,
            v.status === 'active' ? 'Aktif' : v.status === 'maintenance' ? 'Bakımda' : 'Pasif',
            v.inspection_date || '',
            v.notes || ''
        ]);
        
        // CSV oluştur
        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        
        // Dosyayı indir
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `araclar_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showMessage(`${data.length} araç dışa aktarıldı`, 'success');
    } catch (error) {
        console.error('Excel aktarma hatası:', error);
        showMessage('Dışa aktarma başarısız!', 'error');
    }
}