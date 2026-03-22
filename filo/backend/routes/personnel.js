const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM personnel WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json({ success: true, personnel: rows });
    } catch (error) {
        console.error('Personel listesi hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { name, surname, phone, email, position, salary } = req.body;

        await pool.execute(
            `INSERT INTO personnel (user_id, name, surname, phone, email, position, salary) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, name, surname, phone, email, position, salary || 0]
        );

        res.status(201).json({ success: true, message: 'Personel eklendi' });
    } catch (error) {
        console.error('Personel ekleme hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

router.get('/stats/summary', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT COUNT(*) as total,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                    SUM(CASE WHEN position = 'driver' THEN 1 ELSE 0 END) as drivers
             FROM personnel WHERE user_id = ?`,
            [req.user.id]
        );
        res.json({ success: true, stats: rows[0] });
    } catch (error) {
        console.error('İstatistik hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

module.exports = router;