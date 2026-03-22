const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { pool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'eac365-gizli-anahtar-2026';
const SALT_ROUNDS = 10;

// KAYIT OL
router.post('/register', async (req, res) => {
    try {
        const { name, company, email, phone, password } = req.body;
        
        console.log('📝 Kayıt isteği:', email);

        const [existing] = await pool.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Bu e-posta zaten kayıtlı!' 
            });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        await pool.execute(
            `INSERT INTO users (name, company, email, phone, password, role) 
             VALUES (?, ?, ?, ?, ?, 'user')`,
            [name, company, email, phone || null, hashedPassword]
        );

        console.log('✅ Kayıt başarılı:', email);

        res.status(201).json({
            success: true,
            message: 'Kayıt başarılı! Şimdi giriş yapabilirsiniz.'
        });

    } catch (error) {
        console.error('❌ Kayıt hatası:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Kayıt sırasında bir hata oluştu' 
        });
    }
});

// GİRİŞ YAP
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('🔐 Login denemesi:', email);

        const [rows] = await pool.execute(
            'SELECT id, name, email, company, phone, password, role FROM users WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            console.log('❌ Kullanıcı bulunamadı:', email);
            return res.status(401).json({ 
                success: false, 
                error: 'E-posta veya şifre hatalı' 
            });
        }

        const user = rows[0];
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            console.log('❌ Şifre hatalı:', email);
            return res.status(401).json({ 
                success: false, 
                error: 'E-posta veya şifre hatalı' 
            });
        }

        console.log('✅ Giriş başarılı:', email);

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });

        res.json({
            success: true,
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                company: user.company,
                phone: user.phone,
                role: user.role
            }
        });

    } catch (error) {
        console.error('❌ Login hatası:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Sunucu hatası' 
        });
    }
});

// TOKEN DOĞRULA
router.get('/verify', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1] || req.cookies?.token;
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                error: 'Token bulunamadı' 
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        
        const [rows] = await pool.execute(
            'SELECT id, name, email, company, phone, role FROM users WHERE id = ?',
            [decoded.id]
        );

        if (rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                error: 'Kullanıcı bulunamadı' 
            });
        }

        res.json({ 
            success: true, 
            user: rows[0] 
        });

    } catch (error) {
        console.error('Token doğrulama hatası:', error.message);
        res.status(401).json({ 
            success: false, 
            error: 'Geçersiz token' 
        });
    }
});

// ÇIKIŞ YAP
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ 
        success: true, 
        message: 'Çıkış yapıldı' 
    });
});

module.exports = router;