const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { sequelize } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'eac365-gizli-anahtar';

// GİRİŞ YAP
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const [users] = await sequelize.query(
            'SELECT id, name, company, email, phone, role FROM users WHERE email = ? AND password = ?',
            { replacements: [email, password] }
        );

        if (users.length > 0) {
            const user = users[0];
            console.log('Giriş yapan kullanıcı ID:', user.id); // Kontrol için
            
            const token = jwt.sign(
                { 
                    id: user.id,  // Veritabanındaki gerçek ID (1)
                    email: user.email, 
                    role: user.role 
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.json({
                success: true,
                message: 'Giriş başarılı!',
                token,
                user
            });
        } else {
            res.status(401).json({
                success: false,
                error: 'E-posta veya şifre hatalı!'
            });
        }

    } catch (error) {
        console.error('Giriş hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası!' });
    }
});

// TOKEN DOĞRULA
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ success: false, error: 'Token yok!' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('Token decoded ID:', decoded.id); // Kontrol için

        const [users] = await sequelize.query(
            'SELECT id, name, company, email, phone, role FROM users WHERE id = ?',
            { replacements: [decoded.id] }
        );

        if (users.length === 0) {
            return res.status(401).json({ success: false, error: 'Kullanıcı yok!' });
        }

        res.json({ success: true, user: users[0] });

    } catch (error) {
        console.error('Token doğrulama hatası:', error);
        res.status(401).json({ success: false, error: 'Geçersiz token!' });
    }
});

module.exports = router;