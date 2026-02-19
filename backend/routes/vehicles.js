const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const VALID_FUELS    = ['diesel', 'gasoline', 'lpg', 'electric'];
const VALID_STATUSES = ['active', 'maintenance', 'passive'];

router.get('/stats/summary', authenticateToken, async (req, res) => {
    try {
        const [[stats]] = await sequelize.query(
            `SELECT COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(kilometer) as total_km
             FROM vehicles WHERE user_id = ?`,
            { replacements: [req.user.id] }
        );
        res.json({ success: true, stats });
    } catch (error) {
        console.error('[VEHICLES] İstatistik hatası:', error.message);
        res.status(500).json({ success: false, error: 'Sunucu hatası.' });
    }
});

router.get('/', authenticateToken, async (req, res) => {
    try {
        const [vehicles] = await sequelize.query(
            'SELECT * FROM vehicles WHERE user_id = ? ORDER BY created_at DESC',
            { replacements: [req.user.id] }
        );
        res.json({ success: true, vehicles });
    } catch (error) {
        console.error('[VEHICLES] Liste hatası:', error.message);
        res.status(500).json({ success: false, error: 'Sunucu hatası.' });
    }
});

router.post('/', authenticateToken, async (req, res) => {
    try {
        const { plate, brand, model, year, fuel_type, kilometer, status, inspection_date, notes } = req.body;
        if (!plate?.trim()) return res.status(400).json({ success: false, error: 'Plaka zorunludur.' });
        if (fuel_type && !VALID_FUELS.includes(fuel_type))    return res.status(400).json({ success: false, error: 'Geçersiz yakıt tipi.' });
        if (status   && !VALID_STATUSES.includes(status))     return res.status(400).json({ success: false, error: 'Geçersiz araç durumu.' });

        await sequelize.query(
            `INSERT INTO vehicles (user_id, plate, brand, model, year, fuel_type, kilometer, status, inspection_date, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            { replacements: [req.user.id, plate.trim().toUpperCase(), brand?.trim() || null, model?.trim() || null,
                year ? parseInt(year) : null, fuel_type || 'diesel', Math.max(0, parseInt(kilometer) || 0),
                status || 'active', inspection_date || null, notes?.trim() || null] }
        );
        res.status(201).json({ success: true, message: 'Araç eklendi!' });
    } catch (error) {
        console.error('[VEHICLES] Ekleme hatası:', error.message);
        res.status(500).json({ success: false, error: 'Sunucu hatası.' });
    }
});

router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const vehicleId = parseInt(req.params.id);
        if (isNaN(vehicleId)) return res.status(400).json({ success: false, error: 'Geçersiz araç ID.' });

        const [ex] = await sequelize.query('SELECT id FROM vehicles WHERE id = ? AND user_id = ?', { replacements: [vehicleId, req.user.id] });
        if (ex.length === 0) return res.status(404).json({ success: false, error: 'Araç bulunamadı.' });

        const { plate, brand, model, year, fuel_type, kilometer, status, inspection_date, notes } = req.body;
        if (fuel_type && !VALID_FUELS.includes(fuel_type))    return res.status(400).json({ success: false, error: 'Geçersiz yakıt tipi.' });
        if (status   && !VALID_STATUSES.includes(status))     return res.status(400).json({ success: false, error: 'Geçersiz araç durumu.' });

        await sequelize.query(
            `UPDATE vehicles SET plate=?, brand=?, model=?, year=?, fuel_type=?, kilometer=?, status=?, inspection_date=?, notes=?
             WHERE id=? AND user_id=?`,
            { replacements: [plate?.trim().toUpperCase(), brand?.trim(), model?.trim(), year ? parseInt(year) : null,
                fuel_type, Math.max(0, parseInt(kilometer) || 0), status, inspection_date || null,
                notes?.trim() || null, vehicleId, req.user.id] }
        );
        res.json({ success: true, message: 'Araç güncellendi!' });
    } catch (error) {
        console.error('[VEHICLES] Güncelleme hatası:', error.message);
        res.status(500).json({ success: false, error: 'Sunucu hatası.' });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const vehicleId = parseInt(req.params.id);
        if (isNaN(vehicleId)) return res.status(400).json({ success: false, error: 'Geçersiz araç ID.' });

        const [ex] = await sequelize.query('SELECT id FROM vehicles WHERE id = ? AND user_id = ?', { replacements: [vehicleId, req.user.id] });
        if (ex.length === 0) return res.status(404).json({ success: false, error: 'Araç bulunamadı.' });

        await sequelize.query('DELETE FROM vehicles WHERE id = ? AND user_id = ?', { replacements: [vehicleId, req.user.id] });
        res.json({ success: true, message: 'Araç silindi!' });
    } catch (error) {
        console.error('[VEHICLES] Silme hatası:', error.message);
        res.status(500).json({ success: false, error: 'Sunucu hatası.' });
    }
});

module.exports = router;
