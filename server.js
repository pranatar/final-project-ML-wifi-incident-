/**
 * Server Utama: Sistem Resolusi Insiden Wi-Fi Tugas Daring
 * Menggabungkan REST API Engine dan Static Web Server (Native Node.js - Zero Dependencies)
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const os = require('node:os');
const { handleApiRequest } = require('./src/routes');
const { getDb } = require('./src/db');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf'
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    const pathname = parsedUrl.pathname;

    // 1. Delegasikan request API ke Router
    if (pathname.startsWith('/api/')) {
        return handleApiRequest(req, res);
    }

    // 2. Layani Static Files (Frontend UI)
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    filePath = path.normalize(filePath);

    // Keamanan path traversal
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('403 Forbidden');
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // Fallback ke index.html atau mockup jika file tidak ditemukan
            if (pathname === '/' || pathname === '/index.html') {
                const indexPath = path.join(PUBLIC_DIR, 'index.html');
                const mockupPath = path.join(PUBLIC_DIR, 'mockup_antarmuka_sistem.html');
                const target = fs.existsSync(indexPath) ? indexPath : mockupPath;
                if (fs.existsSync(target)) {
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    return fs.createReadStream(target).pipe(res);
                }
            }
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end(`404 Not Found: Berkas ${pathname} tidak ditemukan`);
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    });
});

// Auto-verifikasi koneksi database sebelum listen
try {
    getDb();
    console.log(`[DATABASE] Koneksi ke SQLite (wifi_incident.db) aktif.`);
} catch (e) {
    console.error(`[DATABASE ERROR] Gagal inisialisasi basis data:`, e);
}

if (require.main === module) {
    server.listen(PORT, '0.0.0.0', () => {
        // Deteksi semua IP lokal secara otomatis
        const interfaces = os.networkInterfaces();
        const localIps = [];
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    localIps.push({ name, address: iface.address });
                }
            }
        }

        console.log(`\n================================================================`);
        console.log(`🚀 SERVER SISTEM RESOLUSI WI-FI KAMPUS BERJALAN AKTIF!`);
        console.log(`================================================================`);
        console.log(`💻 Akses di laptop ini  : http://localhost:${PORT}`);
        console.log(`🛠️  Health Check         : http://localhost:${PORT}/api/health`);
        console.log(`----------------------------------------------------------------`);
        if (localIps.length > 0) {
            console.log(`📶 Akses dari HP/Teman (sambungkan ke hotspot yg sama):`);
            for (const ip of localIps) {
                console.log(`   [${ip.name}]  http://${ip.address}:${PORT}`);
            }
        } else {
            console.log(`⚠️  Tidak ada jaringan aktif. Aktifkan hotspot terlebih dahulu.`);
        }
        console.log(`================================================================\n`);
    });
}

module.exports = server;

