function switchTab(tab) {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(t => t.classList.remove('active'));
    forms.forEach(f => f.classList.add('hidden'));
    
    if (tab === 'login') {
        tabs[0].classList.add('active');
        document.getElementById('loginForm').classList.remove('hidden');
    } else {
        tabs[1].classList.add('active');
        document.getElementById('registerForm').classList.remove('hidden');
    }
}

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('eac_token', data.token);
            localStorage.setItem('eac_user', JSON.stringify(data.user));
            window.location.href = 'index.html';
        } else {
            showMessage(data.error || 'Giriş başarısız!', 'error');
        }
    } catch (error) {
        showMessage('Sunucuya bağlanılamadı!', 'error');
    }
});

document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const company = document.getElementById('registerCompany').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    
    if (password !== passwordConfirm) {
        showMessage('Şifreler eşleşmiyor!', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, company, email, phone, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('Kayıt başarılı! Giriş yapabilirsiniz.', 'success');
            switchTab('login');
        } else {
            showMessage(data.error || 'Kayıt başarısız!', 'error');
        }
    } catch (error) {
        showMessage('Sunucuya bağlanılamadı!', 'error');
    }
});

function showAppScreen() {
    const authScreen = document.getElementById('authScreen');
    const appScreen = document.getElementById('appScreen');
    
    if (authScreen) authScreen.style.display = 'none';
    if (appScreen) appScreen.style.display = 'block';
    
    updateUserInfo();
}