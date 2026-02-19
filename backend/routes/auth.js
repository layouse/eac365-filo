const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sequelize } = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ success: false, error: 'E-posta ve şifre zorunludur.' });
        }

        const [users] = await sequelize.query(
            'SELECT id, name, company, email, phone, role, password FROM users WHERE email = ? LIMIT 1',
            { replacements: [email.toLowerCase().trim()] }
        );

        const DUMMY = '$2a$12$invalidhashfortimingxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
        const hash = users.length > 0 ? users[0].password : DUMMY;
        const valid = await bcrypt.compare(password, hash);

        if (!valid || users.length === 0) {
            return res.status(401).json({ success: false, error: 'E-posta veya şifre hatalı.' });
        }

        const { password: _pw, ...safeUser } = users[0];
        const token = jwt.sign({ id: users[0].id, email: users[0].email, role: users[0].role }, JWT_SECRET, { expiresIn: '8h' });

        res.json({ success: true, message: 'Giriş başarılı!', token, user: safeUser });
    } catch (error) {
        console.error('[AUTH] Giriş hatası:', error.message);
        res.status(500).json({ success: false, error: 'Sunucu hatası!' });
    }
});

router.post('/register', async (req, res) => {
    try {
        const { name, company, email, phone, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, error: 'Ad, e-posta ve şifre zorunludur.' });
        }
        if (password.length < 8) {
            return res.status(400).json({ success: false, error: 'Şifre en az 8 karakter olmalıdır.' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, error: 'Geçerli bir e-posta adresi girin.' });
        }

        const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

        await sequelize.query(
            'INSERT INTO users (name, company, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)',
            { replacements: [name.trim(), company?.trim() || null, email.toLowerCase().trim(), phone?.trim() || null, hashedPassword, 'user'] }
        );

        res.status(201).json({ success: true, message: 'Kayıt başarılı! Giriş yapabilirsiniz.' });
    } catch (error) {
        if (error.original?.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, error: 'Bu e-posta adresi zaten kayıtlı.' });
        }
        console.error('[AUTH] Kayıt hatası:', error.message);
        res.status(500).json({ success: false, error: 'Sunucu hatası!' });
    }
});

router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ success: false, error: 'Token eksik.' });

        const decoded = jwt.verify(token, JWT_SECRET);
        const [users] = await sequelize.query(
            'SELECT id, name, company, email, phone, role FROM users WHERE id = ? LIMIT 1',
            { replacements: [decoded.id] }
        );

        if (users.length === 0) return res.status(401).json({ success: false, error: 'Kullanıcı bulunamadı.' });
        res.json({ success: true, user: users[0] });
    } catch (error) {
        res.status(401).json({ success: false, error: 'Geçersiz token.' });
    }
});

module.exports = router;
