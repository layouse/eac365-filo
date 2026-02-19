require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { testConnection } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"]
        }
    }
}));

const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [(process.env.ALLOWED_ORIGIN || 'https://yourdomain.com')]
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin && process.env.NODE_ENV !== 'production') return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('CORS politikası ihlali'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Çok fazla istek gönderildi, lütfen bekleyin.' }
}));

app.use('/api/auth/login', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, error: 'Çok fazla giriş denemesi. 15 dakika bekleyin.' }
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/auth',         require('./routes/auth'));
app.use('/api/personnel',    require('./routes/personnel'));
app.use('/api/vehicles',     require('./routes/vehicles'));
app.use('/api/transactions', require('./routes/transactions'));

if (process.env.NODE_ENV !== 'production') {
    app.get('/api/test', (req, res) => res.json({ success: true, message: 'API çalışıyor!' }));
}

app.get('/',         (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));
app.get('/panel',    (req, res) => res.sendFile(path.join(__dirname, '../frontend/Panel.html')));
app.get('/personel', (req, res) => res.sendFile(path.join(__dirname, '../frontend/personel.html')));
app.get('/araclar',  (req, res) => res.sendFile(path.join(__dirname, '../frontend/araclar.html')));

app.use((req, res) => res.status(404).json({ success: false, error: 'Endpoint bulunamadı.' }));

app.use((err, req, res, next) => {
    console.error('[HATA]', err.message);
    res.status(500).json({ success: false, error: 'Sunucu hatası!' });
});

const start = async () => {
    const connected = await testConnection();
    if (!connected && process.env.NODE_ENV === 'production') process.exit(1);
    app.listen(PORT, () => console.log(`\n🚀 SUNUCU ÇALIŞIYOR: http://localhost:${PORT}\n`));
};

start();
