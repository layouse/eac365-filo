const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.startsWith('CHANGE_ME')) {
    process.env.NODE_ENV === 'production'
        ? (console.error('FATAL: JWT_SECRET tanımlanmamış!'), process.exit(1))
        : console.warn('⚠️  UYARI: JWT_SECRET ayarlanmamış!');
}

const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'Token eksik.' });

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        const msg = err.name === 'TokenExpiredError'
            ? 'Token süresi dolmuş, lütfen tekrar giriş yapın.'
            : 'Geçersiz token.';
        res.status(err.name === 'TokenExpiredError' ? 401 : 403).json({ success: false, error: msg });
    }
};

module.exports = { authenticateToken, JWT_SECRET };
