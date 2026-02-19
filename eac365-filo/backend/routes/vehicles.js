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

// TÜM ARAÇLARI GETİR
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Token'dan gelen ID'yi kullanma, SABİT 1 kullan
        const userId = 1;
        
        const [vehicles] = await sequelize.query(
            'SELECT * FROM vehicles WHERE user_id = ? ORDER BY created_at DESC',
            { replacements: [userId] }
        );
        
        res.json({ success: true, vehicles });
    } catch (error) {
        console.error('Araç listesi hatası:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// YENİ ARAÇ EKLE
router.post('/', authenticateToken, async (req, res) => {
    try {
        // Token'dan gelen ID yerine SABİT 1 kullan
        const userId = 1;
        const { plate, brand, model, year, fuel_type, kilometer, status, inspection_date, notes } = req.body;

        if (!plate) {
            return res.status(400).json({ success: false, error: 'Plaka zorunludur!' });
        }

        await sequelize.query(
            `INSERT INTO vehicles (user_id, plate, brand, model, year, fuel_type, kilometer, status, inspection_date, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            {
                replacements: [
                    userId,  // SABİT 1
                    plate,
                    brand || null,
                    model || null,
                    year || null,
                    fuel_type || 'diesel',
                    kilometer || 0,
                    status || 'active',
                    inspection_date || null,
                    notes || null
                ]
            }
        );

        res.status(201).json({ success: true, message: 'Araç eklendi!' });

    } catch (error) {
        console.error('Araç ekleme hatası:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ARAÇ GÜNCELLE
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = 1;  // SABİT
        const { plate, brand, model, year, fuel_type, kilometer, status, inspection_date, notes } = req.body;

        await sequelize.query(
            `UPDATE vehicles 
             SET plate = ?, brand = ?, model = ?, year = ?, fuel_type = ?, 
                 kilometer = ?, status = ?, inspection_date = ?, notes = ?
             WHERE id = ? AND user_id = ?`,
            {
                replacements: [
                    plate, brand, model, year, fuel_type,
                    kilometer, status, inspection_date, notes,
                    req.params.id, userId
                ]
            }
        );

        res.json({ success: true, message: 'Araç güncellendi!' });

    } catch (error) {
        console.error('Araç güncelleme hatası:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ARAÇ SİL
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = 1;  // SABİT

        await sequelize.query(
            'DELETE FROM vehicles WHERE id = ? AND user_id = ?',
            { replacements: [req.params.id, userId] }
        );

        res.json({ success: true, message: 'Araç silindi!' });

    } catch (error) {
        console.error('Araç silme hatası:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// İSTATİSTİKLER
router.get('/stats/summary', authenticateToken, async (req, res) => {
    try {
        const userId = 1;  // SABİT

        const [stats] = await sequelize.query(
            `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(kilometer) as total_km
             FROM vehicles
             WHERE user_id = ?`,
            { replacements: [userId] }
        );

        res.json({ success: true, stats: stats[0] });

    } catch (error) {
        console.error('İstatistik hatası:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;