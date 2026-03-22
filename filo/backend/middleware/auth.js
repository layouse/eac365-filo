const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'eac365-gizli-anahtar-2026';

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const cookieToken = req.cookies?.token;
    const finalToken = token || cookieToken;

    if (!finalToken) {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ 
                success: false, 
                error: 'Oturum bulunamadı' 
            });
        } else {
            return res.redirect('/login');
        }
    }

    jwt.verify(finalToken, JWT_SECRET, (err, user) => {
        if (err) {
            if (req.path.startsWith('/api/')) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Oturum süresi dolmuş' 
                });
            } else {
                res.clearCookie('token');
                return res.redirect('/login');
            }
        }
        req.user = user;
        next();
    });
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Yetkisiz erişim' 
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                error: 'Bu işlem için yetkiniz yok' 
            });
        }
        next();
    };
};

module.exports = { authenticateToken, authorize };