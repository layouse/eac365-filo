const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// TÜM İŞLEMLERİ GETİR
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const type = req.query.type || '';
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT * FROM transactions WHERE user_id = ?';
        const params = [req.user.id];
        
        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }
        
        if (startDate && endDate) {
            query += ' AND date BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }
        
        query += ' ORDER BY date DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        const [rows] = await pool.execute(query, params);
        
        const [countResult] = await pool.execute(
            'SELECT COUNT(*) as total FROM transactions WHERE user_id = ?',
            [req.user.id]
        );
        
        res.json({ 
            success: true, 
            transactions: rows,
            totalPages: Math.ceil(countResult[0].total / limit),
            currentPage: page
        });
        
    } catch (error) {
        console.error('❌ İşlem listesi hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

// =============================================
// YENİ İŞLEM EKLE
// =============================================
router.post('/', async (req, res) => {
    try {
        const { date, type, category, amount, description, vehicle_id, payment_type, document_no } = req.body;
        
        console.log('📝 Yeni işlem ekleniyor:', { date, type, amount });
        
        const [result] = await pool.execute(
            `INSERT INTO transactions 
             (user_id, date, type, category, amount, description, vehicle_id, payment_type, document_no) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, date, type, category, amount, description || null, vehicle_id || null, payment_type || 'cash', document_no || null]
        );
        
        console.log('✅ İşlem eklendi, ID:', result.insertId);
        
        res.status(201).json({ 
            success: true, 
            message: 'İşlem eklendi',
            id: result.insertId
        });
        
    } catch (error) {
        console.error('❌ İşlem ekleme hatası:', error);
        res.status(500).json({ success: false, error: 'İşlem eklenemedi' });
    }
});

// =============================================
// İŞLEM GÜNCELLE
// =============================================
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { date, type, category, amount, description, vehicle_id, payment_type, document_no } = req.body;
        
        console.log(`📝 İşlem güncelleniyor - ID: ${id}`);
        
        // Önce işlemin kullanıcıya ait olduğunu kontrol et
        const [existing] = await pool.execute(
            'SELECT id FROM transactions WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'İşlem bulunamadı veya size ait değil' 
            });
        }
        
        await pool.execute(
            `UPDATE transactions 
             SET date = ?, type = ?, category = ?, amount = ?, description = ?, 
                 vehicle_id = ?, payment_type = ?, document_no = ?
             WHERE id = ? AND user_id = ?`,
            [date, type, category, amount, description, vehicle_id, payment_type, document_no, id, req.user.id]
        );
        
        console.log('✅ İşlem güncellendi, ID:', id);
        
        res.json({ success: true, message: 'İşlem güncellendi' });
        
    } catch (error) {
        console.error('❌ İşlem güncelleme hatası:', error);
        res.status(500).json({ success: false, error: 'İşlem güncellenemedi' });
    }
});

// =============================================
// İŞLEM SİL
// =============================================
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        console.log(`🗑️ İşlem siliniyor - ID: ${id}, Kullanıcı: ${req.user.id}`);
        
        // Önce işlemin kullanıcıya ait olduğunu kontrol et
        const [existing] = await pool.execute(
            'SELECT id FROM transactions WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'İşlem bulunamadı veya size ait değil' 
            });
        }
        
        await pool.execute(
            'DELETE FROM transactions WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );
        
        console.log('✅ İşlem silindi, ID:', id);
        
        res.json({ success: true, message: 'İşlem silindi' });
        
    } catch (error) {
        console.error('❌ İşlem silme hatası:', error);
        res.status(500).json({ success: false, error: 'İşlem silinemedi' });
    }
});

// =============================================
// TEK İŞLEM GETİR
// =============================================
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        const [rows] = await pool.execute(
            'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'İşlem bulunamadı' 
            });
        }
        
        res.json({ success: true, transaction: rows[0] });
        
    } catch (error) {
        console.error('❌ İşlem detay hatası:', error);
        res.status(500).json({ success: false, error: 'İşlem detayı alınamadı' });
    }
});

// =============================================
// İSTATİSTİKLER
// =============================================
router.get('/stats/summary', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT 
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense,
                SUM(CASE WHEN type = 'fuel' THEN amount ELSE 0 END) as fuel,
                COUNT(*) as total
             FROM transactions WHERE user_id = ?`,
            [req.user.id]
        );
        
        res.json({ success: true, stats: rows[0] });
        
    } catch (error) {
        console.error('❌ İstatistik hatası:', error);
        res.status(500).json({ success: false, error: 'İstatistikler alınamadı' });
    }
});

// =============================================
// SON İŞLEMLER
// =============================================
router.get('/recent/limit', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        
        const [rows] = await pool.execute(
            'SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC LIMIT ?',
            [req.user.id, limit]
        );
        
        res.json({ success: true, transactions: rows });
        
    } catch (error) {
        console.error('❌ Son işlemler hatası:', error);
        res.status(500).json({ success: false, error: 'Son işlemler alınamadı' });
    }
});

module.exports = router;