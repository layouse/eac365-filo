let vehicles = [];
let currentVehicleId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadVehicles();
    setupEventListeners();
    checkUrlParams();
});

function setupEventListeners() {
    document.getElementById('searchInput')?.addEventListener('input', filterVehicles);
    document.getElementById('statusFilter')?.addEventListener('change', filterVehicles);
    document.getElementById('fuelFilter')?.addEventListener('change', filterVehicles);
    
    document.getElementById('vehicleForm')?.addEventListener('submit', saveVehicle);
    document.getElementById('fuelForm')?.addEventListener('submit', saveFuelRecord);
    document.getElementById('maintenanceForm')?.addEventListener('submit', saveMaintenance);
}

function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'add') {
        openVehicleModal();
    }
}

async function loadVehicles() {
    try {
        const data = await apiRequest('/vehicles');
        vehicles = data.vehicles || [];
        updateStats();
        displayVehicles();
    } catch (error) {
        showMessage('Araçlar yüklenirken hata oluştu', 'error');
    }
}

function updateStats() {
    document.getElementById('totalVehicleCount').textContent = vehicles.length;
    document.getElementById('activeVehicleCount').textContent = 
        vehicles.filter(v => v.status === 'active').length;
    document.getElementById('maintenanceCount').textContent = 
        vehicles.filter(v => v.status === 'maintenance').length;
    
    const totalKm = vehicles.reduce((sum, v) => sum + (v.kilometer || 0), 0);
    document.getElementById('totalKmCount').textContent = `${totalKm.toLocaleString()} km`;
}

function displayVehicles() {
    const grid = document.getElementById('vehiclesGrid');
    const filtered = getFilteredVehicles();
    
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-truck"></i>
                <h3>Araç bulunamadı</h3>
                <p>Yeni araç eklemek için "Yeni Araç Ekle" butonuna tıklayın.</p>
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
            <div class="vehicle-card">
                <div class="vehicle-card-header">
                    <div class="vehicle-plate">${v.plate}</div>
                    <div class="vehicle-status">
                        <span class="badge badge-${statusClass}">${statusText}</span>
                    </div>
                </div>
                
                <div class="vehicle-card-body">
                    <div class="vehicle-info">
                        <div class="info-item">
                            <span class="info-label">Marka/Model</span>
                            <span class="info-value">${v.brand || '-'} ${v.model || '-'}</span>
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
                    
                    <div class="vehicle-stats">
                        <div class="stat" title="Bu Ay Yakıt">
                            <i class="fas fa-gas-pump"></i>
                            <span>${(v.monthlyFuel || 0).toFixed(1)} L</span>
                        </div>
                        <div class="stat" title="Bu Ay Bakım">
                            <i class="fas fa-wrench"></i>
                            <span>${(v.monthlyMaintenance || 0).toFixed(0)} ₺</span>
                        </div>
                        <div class="stat" title="Son Bakım">
                            <i class="fas fa-calendar-check"></i>
                            <span>${v.lastMaintenance || '-'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="vehicle-card-footer">
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="editVehicle(${v.id})" title="Düzenle">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="openFuelModal(${v.id})" title="Yakıt Ekle">
                            <i class="fas fa-gas-pump"></i>
                        </button>
                        <button class="btn-icon" onclick="openMaintenanceModal(${v.id})" title="Bakım Ekle">
                            <i class="fas fa-wrench"></i>
                        </button>
                        <button class="btn-icon" onclick="viewVehicleDetails(${v.id})" title="Detaylar">
                            <i class="fas fa-chart-line"></i>
                        </button>
                        <button class="btn-icon delete" onclick="deleteVehicle(${v.id})" title="Sil">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    grid.innerHTML = html;
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
    const fuelFilter = document.getElementById('fuelFilter')?.value || '';
    
    return vehicles.filter(v => {
        const matchesSearch = !searchTerm || 
            v.plate?.toLowerCase().includes(searchTerm) ||
            v.brand?.toLowerCase().includes(searchTerm) ||
            v.model?.toLowerCase().includes(searchTerm);
        
        const matchesStatus = !statusFilter || v.status === statusFilter;
        const matchesFuel = !fuelFilter || v.fuel_type === fuelFilter;
        
        return matchesSearch && matchesStatus && matchesFuel;
    });
}

function filterVehicles() {
    displayVehicles();
}

function openVehicleModal(vehicle = null) {
    currentVehicleId = vehicle?.id || null;
    
    if (vehicle) {
        document.getElementById('modalTitle').textContent = 'Araç Düzenle';
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
    } else {
        document.getElementById('modalTitle').textContent = 'Yeni Araç Ekle';
        document.getElementById('vehicleForm').reset();
        document.getElementById('vehicleId').value = '';
        document.getElementById('status').value = 'active';
        document.getElementById('fuelType').value = 'diesel';
    }
    
    document.getElementById('vehicleModal').classList.add('active');
}

function closeVehicleModal() {
    document.getElementById('vehicleModal').classList.remove('active');
    currentVehicleId = null;
}

async function saveVehicle(e) {
    e.preventDefault();
    
    const vehicleData = {
        plate: document.getElementById('plate').value,
        brand: document.getElementById('brand').value,
        model: document.getElementById('model').value,
        year: parseInt(document.getElementById('year').value) || null,
        fuel_type: document.getElementById('fuelType').value,
        kilometer: parseInt(document.getElementById('kilometer').value) || 0,
        status: document.getElementById('status').value,
        inspection_date: document.getElementById('inspectionDate').value || null,
        notes: document.getElementById('notes').value || null
    };
    
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
        loadVehicles();
    } catch (error) {
        showMessage('Araç kaydedilemedi', 'error');
    }
}

function editVehicle(id) {
    const vehicle = vehicles.find(v => v.id === id);
    if (vehicle) openVehicleModal(vehicle);
}

async function deleteVehicle(id) {
    if (!confirm('Bu aracı silmek istediğinize emin misiniz?')) return;
    
    try {
        await apiRequest(`/vehicles/${id}`, 'DELETE');
        showMessage('Araç silindi', 'success');
        loadVehicles();
    } catch (error) {
        showMessage('Araç silinemedi', 'error');
    }
}

function openFuelModal(vehicleId) {
    currentVehicleId = vehicleId;
    document.getElementById('fuelVehicleId').value = vehicleId;
    document.getElementById('fuelDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('fuelForm').reset();
    document.getElementById('fuelModal').classList.add('active');
}

function closeFuelModal() {
    document.getElementById('fuelModal').classList.remove('active');
    currentVehicleId = null;
}

async function saveFuelRecord(e) {
    e.preventDefault();
    
    const fuelData = {
        vehicle_id: currentVehicleId,
        date: document.getElementById('fuelDate').value,
        liters: parseFloat(document.getElementById('liters').value),
        price_per_liter: parseFloat(document.getElementById('pricePerLiter').value),
        kilometer: parseInt(document.getElementById('fuelKm').value) || null,
        station: document.getElementById('station').value || null
    };
    
    try {
        await apiRequest('/fuel', 'POST', fuelData);
        showMessage('Yakıt kaydı eklendi', 'success');
        closeFuelModal();
        loadVehicles();
    } catch (error) {
        showMessage('Yakıt kaydı eklenemedi', 'error');
    }
}

function openMaintenanceModal(vehicleId) {
    currentVehicleId = vehicleId;
    document.getElementById('maintenanceVehicleId').value = vehicleId;
    document.getElementById('maintenanceDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('maintenanceForm').reset();
    document.getElementById('maintenanceModal').classList.add('active');
}

function closeMaintenanceModal() {
    document.getElementById('maintenanceModal').classList.remove('active');
    currentVehicleId = null;
}

async function saveMaintenance(e) {
    e.preventDefault();
    
    const maintenanceData = {
        vehicle_id: currentVehicleId,
        date: document.getElementById('maintenanceDate').value,
        type: document.getElementById('maintenanceType').value,
        cost: parseFloat(document.getElementById('maintenanceCost').value),
        kilometer: parseInt(document.getElementById('maintenanceKm').value) || null,
        notes: document.getElementById('maintenanceNotes').value || null
    };
    
    try {
        await apiRequest('/maintenance', 'POST', maintenanceData);
        showMessage('Bakım kaydı eklendi', 'success');
        closeMaintenanceModal();
        loadVehicles();
    } catch (error) {
        showMessage('Bakım kaydı eklenemedi', 'error');
    }
}

function viewVehicleDetails(id) {
    window.location.href = `arac-detay.html?id=${id}`;
}

function exportVehicles() {
    const data = getFilteredVehicles();
    const csv = convertToCSV(data);
    downloadFile('araclar.csv', csv);
}

function convertToCSV(data) {
    const headers = ['Plaka', 'Marka', 'Model', 'Yıl', 'Yakıt', 'Kilometre', 'Durum'];
    const rows = data.map(v => [
        v.plate,
        v.brand,
        v.model,
        v.year,
        getFuelText(v.fuel_type),
        v.kilometer,
        v.status
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
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