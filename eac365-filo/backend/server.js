const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize, testConnection } = require('./config/database');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// API ROUTES
app.use('/api/auth', require('./routes/auth'));
app.use('/api/personnel', require('./routes/personnel'));
app.use('/api/vehicles', require('./routes/vehicles'));

// TEST
app.get('/api/test', (req, res) => {
    res.json({ success: true, message: 'API çalışıyor!' });
});

// FRONTEND ROUTES
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));
app.get('/panel', (req, res) => res.sendFile(path.join(__dirname, '../frontend/panel.html')));
app.get('/personel', (req, res) => res.sendFile(path.join(__dirname, '../frontend/personel.html')));
app.get('/araclar', (req, res) => res.sendFile(path.join(__dirname, '../frontend/araclar.html')));

// 404
app.use((req, res) => {
    res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>404</title></head>
        <body style="text-align:center;padding:50px;font-family:Arial">
            <h1>404</h1>
            <p>Sayfa bulunamadı</p>
            <a href="/">Ana Sayfa</a>
        </body>
        </html>
    `);
});

// BAŞLAT
const start = async () => {
    await testConnection();
    app.listen(PORT, () => {
        console.log(`\n🚀 SUNUCU ÇALIŞIYOR: http://localhost:${PORT}`);
        console.log(`🔐 Giriş: test@eac365.com / 123456\n`);
    });
};

start();