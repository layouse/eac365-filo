const API_URL = '/api'; // [FIX #23] Hardcoded localhost kaldırıldı
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    checkLoginStatus();
    addThemeButton();
});

function initTheme() {
    const savedTheme = localStorage.getItem('eac_theme') || 'light';
    document.body.className = savedTheme + '-theme';
}

function toggleTheme() {
    if (document.body.classList.contains('light-theme')) {
        document.body.className = 'dark-theme';
        localStorage.setItem('eac_theme', 'dark');
    } else {
        document.body.className = 'light-theme';
        localStorage.setItem('eac_theme', 'light');
    }
}

function addThemeButton() {
    const navMenu = document.querySelector('.nav-menu ul');
    if (navMenu && !document.getElementById('themeToggle')) {
        const themeLi = document.createElement('li');
        themeLi.style.marginLeft = 'auto';
        themeLi.innerHTML = `
            <button class="theme-toggle" id="themeToggle" onclick="toggleTheme()">
                <i class="fas fa-sun light-icon"></i>
                <i class="fas fa-moon dark-icon"></i>
            </button>
        `;
        navMenu.appendChild(themeLi);
    }
}

async function checkLoginStatus() {
    const token = localStorage.getItem('eac_token');
    const user = localStorage.getItem('eac_user');
    
    if (token && user) {
        currentUser = JSON.parse(user);
        updateUserInfo();
        
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            showAppScreen();
        }
    } else {
        if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
            window.location.href = 'index.html';
        }
    }
}

function updateUserInfo() {
    const userNameEl = document.getElementById('userName');
    const userCompanyEl = document.getElementById('userCompany');
    
    if (userNameEl && currentUser) {
        userNameEl.textContent = currentUser.name || 'Kullanıcı';
    }
    if (userCompanyEl && currentUser) {
        userCompanyEl.textContent = currentUser.company || 'Firma';
    }
}

async function logout() {
    if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
        localStorage.removeItem('eac_token');
        localStorage.removeItem('eac_user');
        window.location.href = 'index.html';
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
    message.innerHTML = `
        <i class="fas ${getIconForType(type)}"></i>
        <span>${text}</span>
    `;
    
    container.appendChild(message);
    
    setTimeout(() => {
        message.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => message.remove(), 300);
    }, duration);
}

function getIconForType(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY'
    }).format(amount);
}

function formatNumber(number) {
    return new Intl.NumberFormat('tr-TR').format(number);
}

async function apiRequest(endpoint, method = 'GET', data = null) {
    const token = localStorage.getItem('eac_token');
    
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        }
    };
    
    if (data) options.body = JSON.stringify(data);
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        const result = await response.json();
        
        if (!response.ok) throw new Error(result.error || 'Bir hata oluştu');
        
        return result;
    } catch (error) {
        console.error('API Hatası:', error);
        showMessage(error.message, 'error');
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-menu a');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '/' && href === 'index.html')) {
            link.classList.add('active');
        }
    });
});
// [FIX #24] XSS önlemi: kullanıcı girdilerini HTML'e enjekte etmeden önce escape et
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}
