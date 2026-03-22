const API_URL = window.location.origin + '/api';
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 EAC365 Filo başlatılıyor...');
    console.log('📍 Mevcut path:', window.location.pathname);
    
    initTheme();
    await checkLoginStatus();
    addThemeButton();
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
});

function initTheme() {
    const savedTheme = localStorage.getItem('eac_theme') || 'light';
    document.body.className = savedTheme + '-theme';
}

function toggleTheme() {
    document.body.className = document.body.classList.contains('light-theme') ? 'dark-theme' : 'light-theme';
    localStorage.setItem('eac_theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
}

function addThemeButton() {
    const navMenu = document.querySelector('.nav-menu ul');
    if (navMenu && !document.getElementById('themeToggle')) {
        const li = document.createElement('li');
        li.style.marginLeft = 'auto';
        li.innerHTML = `<button class="theme-toggle" id="themeToggle"><i class="fas fa-sun light-icon"></i><i class="fas fa-moon dark-icon"></i></button>`;
        navMenu.appendChild(li);
        document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    }
}

async function checkLoginStatus() {
    const token = localStorage.getItem('eac_token');
    
    if (window.location.pathname === '/login' || window.location.pathname === '/') {
        if (token) window.location.href = '/panel.html';
        return;
    }
    
    if (!token) {
        window.location.href = '/login';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/verify`, {
            headers: { 'Authorization': `Bearer ${token}` },
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                currentUser = data.user;
                updateUserInfo();
                return;
            }
        }
        localStorage.removeItem('eac_token');
        window.location.href = '/login';
    } catch (error) {
        console.error('Token hatası:', error);
        window.location.href = '/login';
    }
}

function updateUserInfo() {
    const userNameEl = document.getElementById('userName');
    const userCompanyEl = document.getElementById('userCompany');
    if (userNameEl && currentUser) userNameEl.textContent = currentUser.name || 'Kullanıcı';
    if (userCompanyEl && currentUser) userCompanyEl.textContent = currentUser.company || 'EAC Lojistik';
}

async function logout() {
    if (!confirm('Çıkış yapmak istediğinize emin misiniz?')) return;
    await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
    localStorage.removeItem('eac_token');
    window.location.href = '/login';
}

async function apiRequest(endpoint, method = 'GET', data = null) {
    const token = localStorage.getItem('eac_token');
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        },
        credentials: 'include'
    };
    if (data) options.body = JSON.stringify(data);
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        if (response.status === 401) {
            localStorage.removeItem('eac_token');
            window.location.href = '/login';
            throw new Error('Oturum süresi doldu');
        }
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Bir hata oluştu');
        return result;
    } catch (error) {
        console.error('API Hatası:', error);
        showMessage(error.message, 'error');
        throw error;
    }
}

function showMessage(text, type = 'info', duration = 3000) {
    let container = document.querySelector('.message-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'message-container';
        document.body.appendChild(container);
    }
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i><span>${text}</span>`;
    container.appendChild(message);
    setTimeout(() => message.remove(), duration);
}

function formatDate(dateString) {
    return dateString ? new Date(dateString).toLocaleDateString('tr-TR') : '-';
}

function formatCurrency(value) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0);
}