// =============================================
// ARAÇ YÖNETİMİ - SON VERSİYON
// =============================================

let vehicles = [];
let currentVehicleId = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('Araç sayfası yüklendi');
    
    if (!localStorage.getItem('eac_token')) {
        window.location.href = '/login';
        return;
    }
    
    initializeButtons();
    loadVehicles();
});

function initializeButtons() {
    // Yeni araç ekle butonu
    const addBtn = document.getElementById('addVehicleBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            console.log('➕ Yeni araç butonu tıklandı');
            openVehicleModal();
        });
    }
    
    // Yenile butonu
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            console.log('🔄 Yenile butonu tıklandı');
            loadVehicles();
        });
    }
    
    // Filtreler
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            filterVehicles();
        });
    }
    
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            filterVehicles();
        });
    }
    
    // Modal kapatma butonları
    const closeBtn = document.getElementById('closeVehicleModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeVehicleModal);
    }
    
    const cancelBtn = document.getElementById('cancelVehicleBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeVehicleModal);
    }
    
    // Form submit
    const vehicleForm = document.getElementById('vehicleForm');
    if (vehicleForm) {
        vehicleForm.addEventListener('submit', saveVehicle);
    }
}

// Filtreleme fonksiyonu (global yap)
window.filterByStatus = function(status) {
    const filter = document.getElementById('statusFilter');
    if (filter) {
        filter.value = status;
        filterVehicles();
    }
};

async function loadVehicles() {
    const grid = document.getElementById('vehiclesGrid');
    grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Araçlar yükleniyor...</p></div>';
    
    try {
        const data = await apiRequest('/vehicles');
        vehicles = data.vehicles || [];
        updateStats();
        displayVehicles();
        showMessage(`${vehicles.length} araç yüklendi`, 'success');
    } catch (error) {
        console.error('Araç yükleme hatası:', error);
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Yükleme Hatası</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" id="retryBtn">Tekrar Dene</button>
            </div>
        `;
        document.getElementById('retryBtn')?.addEventListener('click', loadVehicles);
    }
}

function updateStats() {
    const total = vehicles.length;
    const active = vehicles.filter(v => v.status === 'active').length;
    const maintenance = vehicles.filter(v => v.status === 'maintenance').length;
    const totalKm = vehicles.reduce((sum, v) => sum + (parseInt(v.kilometer) || 0), 0);
    
    document.getElementById('totalVehicleCount').textContent = total;
    document.getElementById('activeVehicleCount').textContent = active;
    document.getElementById('maintenanceCount').textContent = maintenance;
    document.getElementById('totalKmCount').textContent = totalKm.toLocaleString() + ' km';
}

function displayVehicles() {
    const grid = document.getElementById('vehiclesGrid');
    const filtered = getFilteredVehicles();
    
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-truck"></i>
                <h3>Araç bulunamadı</h3>
                <p>Yeni araç eklemek için butona tıklayın.</p>
                <button class="btn btn-primary" id="emptyAddBtn">
                    <i class="fas fa-plus"></i> Araç Ekle
                </button>
            </div>
        `;
        document.getElementById('emptyAddBtn')?.addEventListener('click', () => openVehicleModal());
        return;
    }
    
    let html = '';
    filtered.forEach(v => {
        const statusClass = v.status === 'active' ? 'success' : v.status === 'maintenance' ? 'warning' : 'danger';
        const statusText = v.status === 'active' ? 'Aktif' : v.status === 'maintenance' ? 'Bakımda' : 'Pasif';
        
        html += `
            <div class="vehicle-card" data-id="${v.id}">
                <div class="vehicle-card-header">
                    <div class="vehicle-plate">${v.plate || 'PLAKA YOK'}</div>
                    <div class="vehicle-status">
                        <span class="badge badge-${statusClass}">${statusText}</span>
                    </div>
                </div>
                
                <div class="vehicle-card-body">
                    <div class="vehicle-info-grid">
                        <div class="info-item">
                            <span class="info-label">Marka</span>
                            <span class="info-value">${v.brand || '-'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Model</span>
                            <span class="info-value">${v.model || '-'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Yıl</span>
                            <span class="info-value">${v.year || '-'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Yakıt</span>
                            <span class="info-value">${getFuelText(v.fuel_type)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Kilometre</span>
                            <span class="info-value">${(v.kilometer || 0).toLocaleString()} km</span>
                        </div>
                    </div>
                </div>
                
                <div class="vehicle-card-footer">
                    <div class="action-buttons">
                        <button class="btn-icon edit-btn" data-id="${v.id}" title="Düzenle">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete-btn" data-id="${v.id}" title="Sil">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    grid.innerHTML = html;
    
    // Butonlara event listener ekle
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            editVehicle(parseInt(id));
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            deleteVehicle(parseInt(id));
        });
    });
}

function getFuelText(type) {
    const fuels = {
        'diesel': 'Motorin',
        'gasoline': 'Benzin',
        'lpg': 'LPG',
        'electric': 'Elektrik'
    };
    return fuels[type] || type || '-';
}

function getFilteredVehicles() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    
    return vehicles.filter(v => {
        const matchesSearch = !searchTerm || 
            (v.plate && v.plate.toLowerCase().includes(searchTerm)) ||
            (v.brand && v.brand.toLowerCase().includes(searchTerm)) ||
            (v.model && v.model.toLowerCase().includes(searchTerm));
        
        const matchesStatus = !statusFilter || v.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });
}

function filterVehicles() {
    displayVehicles();
}

function openVehicleModal(vehicle = null) {
    const modal = document.getElementById('vehicleModal');
    const title = document.getElementById('modalTitle');
    
    if (vehicle) {
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
        title.textContent = 'Yeni Araç Ekle';
        document.getElementById('vehicleForm').reset();
        document.getElementById('vehicleId').value = '';
        document.getElementById('status').value = 'active';
        document.getElementById('fuelType').value = 'diesel';
        currentVehicleId = null;
    }
    
    modal.classList.add('active');
}

function closeVehicleModal() {
    document.getElementById('vehicleModal').classList.remove('active');
    currentVehicleId = null;
}

function editVehicle(id) {
    const vehicle = vehicles.find(v => v.id === id);
    if (vehicle) {
        openVehicleModal(vehicle);
    } else {
        showMessage('Araç bulunamadı!', 'error');
    }
}

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
    
    if (!vehicleData.plate) {
        showMessage('Plaka zorunludur!', 'error');
        return;
    }
    
    const id = document.getElementById('vehicleId').value;
    
    try {
        if (id) {
            await apiRequest(`/vehicles/${id}`, 'PUT', vehicleData);
            showMessage('Araç güncellendi!', 'success');
        } else {
            await apiRequest('/vehicles', 'POST', vehicleData);
            showMessage('Araç eklendi!', 'success');
        }
        
        closeVehicleModal();
        await loadVehicles();
    } catch (error) {
        showMessage(error.message || 'Araç kaydedilemedi!', 'error');
    }
}

async function deleteVehicle(id) {
    if (!confirm('Bu aracı silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) {
        return;
    }
    
    try {
        await apiRequest(`/vehicles/${id}`, 'DELETE');
        showMessage('Araç silindi!', 'success');
        await loadVehicles();
    } catch (error) {
        showMessage(error.message || 'Araç silinemedi!', 'error');
    }
}