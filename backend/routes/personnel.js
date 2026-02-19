const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const [personnel] = await sequelize.query(
            'SELECT * FROM personnel WHERE user_id = ? ORDER BY created_at DESC',
            { replacements: [req.user.id] }
        );
        const safe = personnel.map(p => ({ ...p, tc_no: p.tc_no ? `***${p.tc_no.slice(-4)}` : null }));
        res.json({ success: true, personnel: safe });
    } catch (error) {
        console.error('[PERSONNEL] Liste hatası:', error.message);
        res.status(500).json({ success: false, error: 'Sunucu hatası.' });
    }
});

router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, surname, tc_no, phone, email, position, salary, start_date, status, address, notes } = req.body;
        if (!name?.trim() || !surname?.trim()) return res.status(400).json({ success: false, error: 'Ad ve soyad zorunludur.' });
        if (tc_no && !/^\d{11}$/.test(tc_no))  return res.status(400).json({ success: false, error: 'TC 11 haneli olmalıdır.' });
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, error: 'Geçersiz e-posta.' });

        const validPositions = ['driver','manager','mechanic','admin','other'];
        const validStatuses  = ['active','passive','leave'];
        if (position && !validPositions.includes(position)) return res.status(400).json({ success: false, error: 'Geçersiz pozisyon.' });
        if (status   && !validStatuses.includes(status))    return res.status(400).json({ success: false, error: 'Geçersiz durum.' });

        await sequelize.query(
            `INSERT INTO personnel (user_id, name, surname, tc_no, phone, email, position, salary, start_date, status, address, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            { replacements: [req.user.id, name.trim(), surname.trim(), tc_no || null, phone?.trim() || null,
                email?.toLowerCase().trim() || null, position || 'driver', salary ? parseFloat(salary) : null,
                start_date || null, status || 'active', address?.trim() || null, notes?.trim() || null] }
        );
        res.status(201).json({ success: true, message: 'Personel eklendi!' });
    } catch (error) {
        console.error('[PERSONNEL] Ekleme hatası:', error.message);
        res.status(500).json({ success: false, error: 'Sunucu hatası.' });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ success: false, error: 'Geçersiz ID.' });

        const [ex] = await sequelize.query('SELECT id FROM personnel WHERE id = ? AND user_id = ?', { replacements: [id, req.user.id] });
        if (ex.length === 0) return res.status(404).json({ success: false, error: 'Personel bulunamadı.' });

        await sequelize.query('DELETE FROM personnel WHERE id = ? AND user_id = ?', { replacements: [id, req.user.id] });
        res.json({ success: true, message: 'Personel silindi!' });
    } catch (error) {
        console.error('[PERSONNEL] Silme hatası:', error.message);
        res.status(500).json({ success: false, error: 'Sunucu hatası.' });
    }
});

module.exports = router;
