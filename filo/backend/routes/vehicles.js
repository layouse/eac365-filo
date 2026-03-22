const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// TÜM ROUTE'LAR İÇİN AUTHENTICATION GEREKLİ
router.use(authenticateToken);

// =============================================
// TÜM ARAÇLARI GETİR
// =============================================
router.get('/', async (req, res) => {
    try {
        console.log('🔍 Araçlar getiriliyor - Kullanıcı ID:', req.user.id);
        
        const [rows] = await pool.execute(
            'SELECT * FROM vehicles WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );
        
        console.log(`✅ ${rows.length} araç bulundu`);
        res.json({ 
            success: true, 
            vehicles: rows 
        });
        
    } catch (error) {
        console.error('❌ Araç listesi hatası:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Araçlar yüklenirken hata oluştu' 
        });
    }
});

// =============================================
// TEK ARAÇ GETİR (ID'ye göre)
// =============================================
router.get('/:id', async (req, res) => {
    try {
        const vehicleId = parseInt(req.params.id);
        
        const [rows] = await pool.execute(
            'SELECT * FROM vehicles WHERE id = ? AND user_id = ?',
            [vehicleId, req.user.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Araç bulunamadı' 
            });
        }
        
        res.json({ 
            success: true, 
            vehicle: rows[0] 
        });
        
    } catch (error) {
        console.error('❌ Araç detay hatası:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Araç detayı alınamadı' 
        });
    }
});

// =============================================
// YENİ ARAÇ EKLE
// =============================================
router.post('/', async (req, res) => {
    try {
        const { plate, brand, model, year, fuel_type, kilometer, status, inspection_date, notes } = req.body;
        
        console.log('📝 Yeni araç ekleniyor:', { plate, brand, model });
        
        if (!plate) {
            return res.status(400).json({ 
                success: false, 
                error: 'Plaka zorunludur!' 
            });
        }
        
        const [existing] = await pool.execute(
            'SELECT id FROM vehicles WHERE plate = ? AND user_id = ?',
            [plate, req.user.id]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Bu plaka zaten kayıtlı!' 
            });
        }
        
        const [result] = await pool.execute(
            `INSERT INTO vehicles 
             (user_id, plate, brand, model, year, fuel_type, kilometer, status, inspection_date, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                plate.toUpperCase(),
                brand || null,
                model || null,
                year || null,
                fuel_type || 'diesel',
                kilometer || 0,
                status || 'active',
                inspection_date || null,
                notes || null
            ]
        );
        
        const [newVehicle] = await pool.execute(
            'SELECT * FROM vehicles WHERE id = ?',
            [result.insertId]
        );
        
        console.log(`✅ Araç eklendi - ID: ${result.insertId}, Plaka: ${plate}`);
        
        res.status(201).json({
            success: true,
            message: 'Araç başarıyla eklendi!',
            vehicle: newVehicle[0]
        });
        
    } catch (error) {
        console.error('❌ Araç ekleme hatası:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Araç eklenirken hata oluştu' 
        });
    }
});

// =============================================
// ARAÇ GÜNCELLE
// =============================================
router.put('/:id', async (req, res) => {
    try {
        const vehicleId = parseInt(req.params.id);
        const { plate, brand, model, year, fuel_type, kilometer, status, inspection_date, notes } = req.body;
        
        console.log(`📝 Araç güncelleniyor - ID: ${vehicleId}`);
        
        const [existing] = await pool.execute(
            'SELECT id FROM vehicles WHERE id = ? AND user_id = ?',
            [vehicleId, req.user.id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Araç bulunamadı veya size ait değil' 
            });
        }
        
        if (plate) {
            const [plateCheck] = await pool.execute(
                'SELECT id FROM vehicles WHERE plate = ? AND user_id = ? AND id != ?',
                [plate, req.user.id, vehicleId]
            );
            
            if (plateCheck.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Bu plaka başka bir aracınızda kullanılıyor!' 
                });
            }
        }
        
        await pool.execute(
            `UPDATE vehicles 
             SET plate = ?, brand = ?, model = ?, year = ?, fuel_type = ?,
                 kilometer = ?, status = ?, inspection_date = ?, notes = ?
             WHERE id = ? AND user_id = ?`,
            [
                plate,
                brand,
                model,
                year,
                fuel_type,
                kilometer,
                status,
                inspection_date,
                notes,
                vehicleId,
                req.user.id
            ]
        );
        
        const [updated] = await pool.execute(
            'SELECT * FROM vehicles WHERE id = ?',
            [vehicleId]
        );
        
        console.log(`✅ Araç güncellendi - ID: ${vehicleId}`);
        
        res.json({
            success: true,
            message: 'Araç başarıyla güncellendi!',
            vehicle: updated[0]
        });
        
    } catch (error) {
        console.error('❌ Araç güncelleme hatası:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Araç güncellenirken hata oluştu' 
        });
    }
});

// =============================================
// ARAÇ SİL - DÜZELTİLMİŞ VERSİYON (fuel_records kontrolü OLMADAN)
// =============================================
router.delete('/:id', async (req, res) => {
    try {
        const vehicleId = parseInt(req.params.id);
        
        console.log(`🗑️ Araç siliniyor - ID: ${vehicleId}, Kullanıcı: ${req.user.id}`);
        
        // Önce aracın kullanıcıya ait olduğunu kontrol et
        const [vehicle] = await pool.execute(
            'SELECT id, plate FROM vehicles WHERE id = ? AND user_id = ?',
            [vehicleId, req.user.id]
        );
        
        if (vehicle.length === 0) {
            console.log(`❌ Araç bulunamadı veya yetki yok - ID: ${vehicleId}`);
            return res.status(404).json({ 
                success: false, 
                error: 'Araç bulunamadı veya size ait değil' 
            });
        }
        
        console.log(`✅ Araç bulundu: ${vehicle[0].plate}, Siliniyor...`);
        
        // SADECE transactions tablosunda vehicle_id'yi NULL yap (fuel_records ve maintenance yok)
        await pool.execute(
            'UPDATE transactions SET vehicle_id = NULL WHERE vehicle_id = ?',
            [vehicleId]
        );
        console.log(`✅ İşlemler güncellendi`);
        
        // Aracı sil
        const [result] = await pool.execute(
            'DELETE FROM vehicles WHERE id = ? AND user_id = ?',
            [vehicleId, req.user.id]
        );
        
        if (result.affectedRows === 0) {
            throw new Error('Araç silinemedi');
        }
        
        console.log(`✅ Araç başarıyla silindi - ID: ${vehicleId}`);
        
        res.json({ 
            success: true, 
            message: 'Araç başarıyla silindi!' 
        });
        
    } catch (error) {
        console.error('❌ Araç silme hatası:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Araç silinirken hata oluştu: ' + error.message 
        });
    }
});

// =============================================
// ARAÇ İSTATİSTİKLERİ
// =============================================
router.get('/stats/summary', async (req, res) => {
    try {
        console.log(`📊 İstatistikler getiriliyor - Kullanıcı: ${req.user.id}`);
        
        const [rows] = await pool.execute(
            `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
                SUM(CASE WHEN status = 'passive' THEN 1 ELSE 0 END) as passive,
                SUM(kilometer) as total_km,
                AVG(kilometer) as avg_km
             FROM vehicles 
             WHERE user_id = ?`,
            [req.user.id]
        );
        
        const stats = {
            total: rows[0].total || 0,
            active: rows[0].active || 0,
            maintenance: rows[0].maintenance || 0,
            passive: rows[0].passive || 0,
            total_km: rows[0].total_km || 0,
            avg_km: Math.round(rows[0].avg_km) || 0
        };
        
        console.log(`✅ İstatistikler: ${stats.total} araç, ${stats.active} aktif`);
        
        res.json({ 
            success: true, 
            stats 
        });
        
    } catch (error) {
        console.error('❌ İstatistik hatası:', error);
        res.status(500).json({ 
            success: false, 
            error: 'İstatistikler alınamadı' 
        });
    }
});

// =============================================
// SON EKLENEN ARAÇLAR
// =============================================
router.get('/recent/limit', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        
        console.log(`🆕 Son ${limit} araç getiriliyor...`);
        
        const [rows] = await pool.execute(
            'SELECT id, plate, brand, model, year, status, kilometer FROM vehicles WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
            [req.user.id, limit]
        );
        
        res.json({ 
            success: true, 
            vehicles: rows 
        });
        
    } catch (error) {
        console.error('❌ Son araçlar hatası:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Son araçlar alınamadı' 
        });
    }
});

module.exports = router;