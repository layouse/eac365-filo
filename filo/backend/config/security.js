const bcrypt = require('bcrypt');
const crypto = require('crypto');
require('dotenv').config();

// Şifre hash'leme (password_hash() yerine)
const hashPassword = async (password) => {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    return await bcrypt.hash(password, saltRounds);
};

// Şifre doğrulama (password_verify() yerine)
const verifyPassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

// CSRF Token oluşturma
const generateCsrfToken = (req) => {
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    return req.session.csrfToken;
};

// CSRF Token doğrulama
const validateCsrfToken = (req, token) => {
    return req.session.csrfToken && req.session.csrfToken === token;
};

// XSS koruması için girdi temizleme (strip_tags + htmlspecialchars)
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    
    // HTML etiketlerini temizle (strip_tags benzeri)
    let clean = input.replace(/<[^>]*>/g, '');
    
    // Özel karakterleri HTML entitilerine çevir (htmlspecialchars)
    clean = clean.replace(/&/g, '&amp;')
                 .replace(/</g, '&lt;')
                 .replace(/>/g, '&gt;')
                 .replace(/"/g, '&quot;')
                 .replace(/'/g, '&#039;');
    
    return clean.trim();
};

// Tüm POST/GET verilerini temizleme middleware'i
const sanitizeMiddleware = (req, res, next) => {
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            req.body[key] = sanitizeInput(req.body[key]);
        });
    }
    if (req.query) {
        Object.keys(req.query).forEach(key => {
            req.query[key] = sanitizeInput(req.query[key]);
        });
    }
    next();
};

module.exports = {
    hashPassword,
    verifyPassword,
    generateCsrfToken,
    validateCsrfToken,
    sanitizeInput,
    sanitizeMiddleware
};