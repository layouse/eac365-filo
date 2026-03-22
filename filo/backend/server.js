const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { testConnection } = require('./config/database');

const app = express();
const PORT = 5000;

// =============================================
// GÜVENLİK AYARLARI
// =============================================
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

app.use(cors({ 
    origin: 'http://localhost:3000', 
    credentials: true 
}));

app.use(express.json());
app.use(cookieParser());

// Statik dosyaları serve et (BU SIRALAMA ÖNEMLİ!)
app.use(express.static(path.join(__dirname, '../frontend')));

// =============================================
// API ROUTES
// =============================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/personnel', require('./routes/personnel'));
app.use('/api/transactions', require('./routes/transactions'));

// =============================================
// TEST ENDPOINT
// =============================================
app.get('/api/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'API çalışıyor!',
        time: new Date().toISOString()
    });
});

// =============================================
// AUTH MIDDLEWARE (KORUMALI SAYFALAR)
// =============================================
const { authenticateToken } = require('./middleware/auth');

// Korumalı sayfalar (token gerektirenler)
app.get('/panel.html', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/panel.html'));
});

app.get('/araclar.html', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/araclar.html'));
});

app.get('/muhasebe.html', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/muhasebe.html'));
});

app.get('/personel.html', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/personel.html'));
});

app.get('/raporlar.html', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/raporlar.html'));
});

// =============================================
// HERKESE AÇIK SAYFALAR
// =============================================
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/', (req, res) => {
    res.redirect('/login');
});
// API ROUTES
app.use('/api/auth', require('./routes/auth'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/personnel', require('./routes/personnel'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/reports', require('./routes/reports'));  
// =============================================
// 404 HANDLER
// =============================================
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../frontend/404.html'));
});

// =============================================
// HATA YAKALAYICI
// =============================================
app.use((err, req, res, next) => {
    console.error('❌ Sunucu hatası:', err.stack);
    res.status(500).json({ 
        success: false, 
        error: 'Bir hata oluştu' 
    });
});

// =============================================
// SUNUCUYU BAŞLAT
// =============================================
const start = async () => {
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
        console.error('❌ Veritabanı bağlantısı başarısız!');
        process.exit(1);
    }

    app.listen(PORT, () => {
        console.log(`
    🚀 EAC365 FİLO SUNUCUSU
    📍 http://localhost:${PORT}
    🔐 Giriş: http://localhost:${PORT}/login
    📊 Panel: http://localhost:${PORT}/panel.html
    ✅ Veritabanı: Bağlı
        `);
    });
};

start();
