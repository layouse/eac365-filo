// =============================================
// PERSONEL JS - CSP UYUMLU VERSİYON
// =============================================

let personnel = [];
let currentPersonnelId = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('Personel sayfası yüklendi');
    
    if (!localStorage.getItem('eac_token')) {
        window.location.href = '/login';
        return;
    }
    
    initializeButtons();
    loadPersonnel();
});

function initializeButtons() {
    // Yeni personel butonu
    const addBtn = document.getElementById('addPersonnelBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            console.log('➕ Yeni personel butonu tıklandı');
            openPersonnelModal();
        });
    }
    
    // Yenile butonu
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            console.log('🔄 Yenile butonu tıklandı');
            loadPersonnel();
        });
    }
    
    // Filtreler
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterPersonnel);
    }
    
    const positionFilter = document.getElementById('positionFilter');
    if (positionFilter) {
        positionFilter.addEventListener('change', filterPersonnel);
    }
    
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterPersonnel);
    }
    
    // Modal kapatma butonları
    const closeBtn = document.getElementById('closePersonnelModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closePersonnelModal);
    }
    
    const cancelBtn = document.getElementById('cancelPersonnelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closePersonnelModal);
    }
    
    // Form submit
    const personnelForm = document.getElementById('personnelForm');
    if (personnelForm) {
        personnelForm.addEventListener('submit', savePersonnel);
    }
}

async function loadPersonnel() {
    const grid = document.getElementById('personnelGrid');
    grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Personel yükleniyor...</p></div>';
    
    try {
        const data = await apiRequest('/personnel');
        personnel = data.personnel || [];
        updateStats();
        displayPersonnel();
    } catch (error) {
        console.error('Personel yükleme hatası:', error);
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Yükleme Hatası</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" id="retryBtn">Tekrar Dene</button>
            </div>
        `;
        document.getElementById('retryBtn')?.addEventListener('click', loadPersonnel);
    }
}

function updateStats() {
    const total = personnel.length;
    const active = personnel.filter(p => p.status === 'active').length;
    const drivers = personnel.filter(p => p.position === 'driver').length;
    const totalSalary = personnel.reduce((sum, p) => sum + (parseFloat(p.salary) || 0), 0);
    
    document.getElementById('totalPersonnel').textContent = total;
    document.getElementById('activePersonnel').textContent = active;
    document.getElementById('driverCount').textContent = drivers;
    document.getElementById('totalSalary').textContent = formatCurrency(totalSalary);
}

function displayPersonnel() {
    const grid = document.getElementById('personnelGrid');
    const filtered = getFilteredPersonnel();
    
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>Personel bulunamadı</h3>
                <button class="btn btn-primary" id="emptyAddBtn">Personel Ekle</button>
            </div>
        `;
        document.getElementById('emptyAddBtn')?.addEventListener('click', () => openPersonnelModal());
        return;
    }
    
    let html = '';
    filtered.forEach(p => {
        const statusClass = p.status === 'active' ? 'success' : 'danger';
        const statusText = p.status === 'active' ? 'Aktif' : 'Pasif';
        
        html += `
            <div class="personnel-card" data-id="${p.id}">
                <div class="personnel-card-header">
                    <div class="personnel-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="personnel-info">
                        <h3>${p.name || ''} ${p.surname || ''}</h3>
                        <p>${getPositionText(p.position)}</p>
                    </div>
                    <div class="personnel-status">
                        <span class="badge badge-${statusClass}">${statusText}</span>
                    </div>
                </div>
                
                <div class="personnel-card-body">
                    <div class="info-grid">
                        <div class="info-item"><i class="fas fa-phone"></i> ${p.phone || '---'}</div>
                        <div class="info-item"><i class="fas fa-envelope"></i> ${p.email || '---'}</div>
                    </div>
                </div>
                
                <div class="personnel-card-footer">
                    <div class="action-buttons">
                        <button class="btn-icon edit-btn" data-id="${p.id}" title="Düzenle">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete-btn" data-id="${p.id}" title="Sil">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    grid.innerHTML = html;
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            editPersonnel(parseInt(id));
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            deletePersonnel(parseInt(id));
        });
    });
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

function getFilteredPersonnel() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const positionFilter = document.getElementById('positionFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    
    return personnel.filter(p => {
        const fullName = `${p.name || ''} ${p.surname || ''}`.toLowerCase();
        const matchesSearch = !searchTerm || fullName.includes(searchTerm);
        const matchesPosition = !positionFilter || p.position === positionFilter;
        const matchesStatus = !statusFilter || p.status === statusFilter;
        return matchesSearch && matchesPosition && matchesStatus;
    });
}

function filterPersonnel() {
    displayPersonnel();
}

function openPersonnelModal(person = null) {
    const modal = document.getElementById('personnelModal');
    const title = document.getElementById('personnelModalTitle');
    
    if (person) {
        title.textContent = 'Personel Düzenle';
        document.getElementById('personnelId').value = person.id || '';
        document.getElementById('firstName').value = person.name || '';
        document.getElementById('lastName').value = person.surname || '';
        document.getElementById('tcNo').value = person.tc_no || '';
        document.getElementById('phone').value = person.phone || '';
        document.getElementById('email').value = person.email || '';
        document.getElementById('position').value = person.position || 'driver';
        document.getElementById('salary').value = person.salary || '';
        document.getElementById('startDate').value = person.start_date || '';
        document.getElementById('personnelStatus').value = person.status || 'active';
        document.getElementById('address').value = person.address || '';
        document.getElementById('notes').value = person.notes || '';
        currentPersonnelId = person.id;
    } else {
        title.textContent = 'Yeni Personel Ekle';
        document.getElementById('personnelForm').reset();
        document.getElementById('personnelId').value = '';
        document.getElementById('position').value = 'driver';
        document.getElementById('personnelStatus').value = 'active';
        currentPersonnelId = null;
    }
    
    modal.classList.add('active');
}

function closePersonnelModal() {
    document.getElementById('personnelModal').classList.remove('active');
    currentPersonnelId = null;
}

function editPersonnel(id) {
    const person = personnel.find(p => p.id === id);
    if (person) {
        openPersonnelModal(person);
    } else {
        showMessage('Personel bulunamadı!', 'error');
    }
}

async function savePersonnel(e) {
    e.preventDefault();
    
    const personData = {
        name: document.getElementById('firstName').value,
        surname: document.getElementById('lastName').value,
        tc_no: document.getElementById('tcNo').value || null,
        phone: document.getElementById('phone').value || null,
        email: document.getElementById('email').value || null,
        position: document.getElementById('position').value,
        salary: parseFloat(document.getElementById('salary').value) || null,
        start_date: document.getElementById('startDate').value || null,
        status: document.getElementById('personnelStatus').value,
        address: document.getElementById('address').value || null,
        notes: document.getElementById('notes').value || null
    };
    
    if (!personData.name || !personData.surname) {
        showMessage('Ad ve soyad zorunludur!', 'error');
        return;
    }
    
    const id = document.getElementById('personnelId').value;
    
    try {
        if (id) {
            await apiRequest(`/personnel/${id}`, 'PUT', personData);
            showMessage('Personel güncellendi!', 'success');
        } else {
            await apiRequest('/personnel', 'POST', personData);
            showMessage('Personel eklendi!', 'success');
        }
        
        closePersonnelModal();
        await loadPersonnel();
    } catch (error) {
        showMessage(error.message || 'Personel kaydedilemedi!', 'error');
    }
}

async function deletePersonnel(id) {
    if (!confirm('Bu personeli silmek istediğinize emin misiniz?')) return;
    
    try {
        await apiRequest(`/personnel/${id}`, 'DELETE');
        showMessage('Personel silindi!', 'success');
        await loadPersonnel();
    } catch (error) {
        showMessage(error.message || 'Personel silinemedi!', 'error');
    }
}