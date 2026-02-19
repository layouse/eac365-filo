const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ success: false, error: 'Yetkisiz erişim!' });

    jwt.verify(token, 'eac365-gizli-anahtar-2026', (err, user) => {
        if (err) return res.status(403).json({ success: false, error: 'Geçersiz token!' });
        req.user = user;
        next();
    });
};

// TÜM PERSONELİ GETİR
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = 1;  // SABİT
        
        const [personnel] = await sequelize.query(
            'SELECT * FROM personnel WHERE user_id = ? ORDER BY created_at DESC',
            { replacements: [userId] }
        );
        
        res.json({ success: true, personnel });
        
    } catch (error) {
        console.error('Personel listesi hatası:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// YENİ PERSONEL EKLE
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = 1;  // SABİT
        const { name, surname, tc_no, phone, email, position, salary, start_date, status, address, notes } = req.body;

        if (!name || !surname) {
            return res.status(400).json({ success: false, error: 'Ad ve soyad zorunludur!' });
        }

        await sequelize.query(
            `INSERT INTO personnel 
             (user_id, name, surname, tc_no, phone, email, position, salary, start_date, status, address, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            {
                replacements: [
                    userId, name, surname, tc_no, phone, email,
                    position || 'driver', salary, start_date, status || 'active',
                    address, notes
                ]
            }
        );

        res.status(201).json({ success: true, message: 'Personel eklendi!' });

    } catch (error) {
        console.error('Personel ekleme hatası:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;