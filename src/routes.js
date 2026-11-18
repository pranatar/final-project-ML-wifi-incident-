/**
 * Router REST API untuk Sistem Resolusi Gangguan Wi-Fi Kampus
 */
const url = require('node:url');
const ticketService = require('./services/ticketService');
const telemetryService = require('./services/telemetryService');
const dispensationService = require('./services/dispensationService');
const statsService = require('./services/statsService');
const mlService = require('./services/mlService');

async function handleApiRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;
    const query = parsedUrl.query;

    // Helper kirim JSON response
    const sendJson = (statusCode, data) => {
        res.writeHead(statusCode, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        res.end(JSON.stringify(data, null, 2));
    };

    // Helper baca request body
    const parseBody = () => new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (err) {
                reject(new Error('Format JSON pada request body tidak valid'));
            }
        });
        req.on('error', reject);
    });

    // Handle CORS Preflight
    if (method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        return res.end();
    }

    try {
        // 1. Health Check
        if (pathname === '/api/health' && method === 'GET') {
            return sendJson(200, {
                status: 'UP',
                service: 'UPT TIK Wi-Fi Incident Management API',
                version: '1.0.0',
                serverTime: new Date().toISOString()
            });
        }

        // 1.B Autentikasi Pengguna & Role Segregation (Mahasiswa vs IT Kampus)
        if (pathname === '/api/auth/login' && method === 'POST') {
            const body = await parseBody();
            const { role, userId, nama, password } = body;

            if (role === 'IT' || role === 'Network_NOC_L2') {
                if (password !== 'admin123' && password !== 'it2026') {
                    return sendJson(401, { success: false, error: 'Password Tim IT salah! Gunakan: admin123' });
                }
                return sendJson(200, {
                    success: true,
                    message: 'Login Tim IT Berhasil',
                    user: {
                        userId: userId || 'NOC-002',
                        nama: 'Rian Pratama, S.Kom. (IT NOC)',
                        email: 'rian.noc@univ.ac.id',
                        peran: 'Network_NOC_L2'
                    }
                });
            } else {
                if (!userId) {
                    return sendJson(400, { success: false, error: 'NIM Mahasiswa wajib diisi!' });
                }
                const cleanNim = String(userId).trim();
                const studentName = nama && nama.trim() ? nama.trim() : `Mahasiswa (${cleanNim})`;
                return sendJson(200, {
                    success: true,
                    message: 'Login Mahasiswa Berhasil',
                    user: {
                        userId: cleanNim,
                        nama: studentName,
                        email: `${cleanNim}@student.univ.ac.id`,
                        peran: 'Mahasiswa'
                    }
                });
            }
        }

        // 1.C Tiket Khusus Mahasiswa yang sedang login (Security Rule: Mahasiswa hanya melihat tiketnya sendiri)
        if (pathname === '/api/tickets/my' && method === 'GET') {
            const userId = query.userId;
            if (!userId) {
                return sendJson(400, { success: false, error: 'Query parameter userId wajib disertakan' });
            }
            const myTickets = ticketService.getTickets({ userId });
            return sendJson(200, { success: true, count: myTickets.length, data: myTickets });
        }

        // 2. Ruangan (Master Data)
        if (pathname === '/api/rooms' && method === 'GET') {
            const rooms = ticketService.getRooms();
            return sendJson(200, { success: true, count: rooms.length, data: rooms });
        }

        // 3. Tiket Insiden
        if (pathname === '/api/tickets' && method === 'GET') {
            const tickets = ticketService.getTickets(query);
            return sendJson(200, { success: true, count: tickets.length, data: tickets });
        }

        if (pathname === '/api/tickets' && method === 'POST') {
            const body = await parseBody();
            if (!body.userId || !body.idRuangan) {
                return sendJson(400, { success: false, error: 'Field userId dan idRuangan wajib diisi' });
            }
            const newTicket = ticketService.createTicket(body);
            return sendJson(201, {
                success: true,
                message: newTicket.is_clustered 
                    ? 'Tiket terdeteksi sebagai gangguan massal (P1 Critical) dan otomatis dieskalasikan ke NOC!'
                    : 'Tiket berhasil dibuat dan tersimpan di antrean helpdesk.',
                data: newTicket
            });
        }

        // 4. Detail Tiket: /api/tickets/:id
        const ticketDetailMatch = pathname.match(/^\/api\/tickets\/([A-Za-z0-9\-]+)$/);
        if (ticketDetailMatch && method === 'GET') {
            const noTiket = ticketDetailMatch[1];
            const ticket = ticketService.getTicketById(noTiket);
            if (!ticket) return sendJson(404, { success: false, error: `Tiket ${noTiket} tidak ditemukan` });
            return sendJson(200, { success: true, data: ticket });
        }

        // 5. Update Status Tiket: /api/tickets/:id/status
        const ticketStatusMatch = pathname.match(/^\/api\/tickets\/([A-Za-z0-9\-]+)\/status$/);
        if (ticketStatusMatch && method === 'PATCH') {
            const noTiket = ticketStatusMatch[1];
            const body = await parseBody();
            if (!body.status) {
                return sendJson(400, { success: false, error: 'Field status wajib diisi' });
            }
            const updated = ticketService.updateTicketStatus(noTiket, body.status, body.operatorId, body.catatanTeknis, body.aksiTeknis);
            return sendJson(200, { success: true, message: `Status tiket ${noTiket} diubah menjadi ${body.status}`, data: updated });
        }

        // 6. Access Points & Telemetri Real-time
        if (pathname === '/api/access-points' && method === 'GET') {
            const aps = telemetryService.getAccessPoints();
            return sendJson(200, { success: true, count: aps.length, data: aps });
        }

        // 7. Remediasi Jaringan NOC (Load Balancing, DHCP Flush)
        if (pathname === '/api/remediation' && method === 'POST') {
            const body = await parseBody();
            if (!body.apMac) {
                return sendJson(400, { success: false, error: 'Field apMac wajib diisi' });
            }
            const result = telemetryService.executeRemediation(body);
            return sendJson(200, { success: true, message: 'Remediasi teknis berhasil diterapkan oleh NOC', data: result });
        }

        // 8. Surat Dispensasi Akademik
        if (pathname === '/api/dispensations' && method === 'POST') {
            const body = await parseBody();
            if (!body.noTiket) {
                return sendJson(400, { success: false, error: 'Field noTiket wajib diisi' });
            }
            const cert = dispensationService.createDispensation(body);
            return sendJson(201, { success: true, message: 'Surat Keterangan Gangguan Resmi berhasil diterbitkan', data: cert });
        }

        // 9. Verifikasi Surat via Token QR: /api/dispensations/verify/:token
        const verifyMatch = pathname.match(/^\/api\/dispensations\/verify\/([a-f0-9]+)$/);
        if (verifyMatch && method === 'GET') {
            const token = verifyMatch[1];
            const cert = dispensationService.getDispensationByToken(token);
            if (!cert) return sendJson(404, { success: false, valid: false, error: 'Token verifikasi tidak valid atau tidak terdaftar' });
            return sendJson(200, { success: true, valid: true, data: cert });
        }

        // 10. Persetujuan Dosen: /api/dispensations/verify/:token/approve
        const approveMatch = pathname.match(/^\/api\/dispensations\/verify\/([a-f0-9]+)\/approve$/);
        if (approveMatch && method === 'PATCH') {
            const token = approveMatch[1];
            const body = await parseBody();
            const updated = dispensationService.updateApprovalStatus(token, body.status || 'DISETUJUI');
            return sendJson(200, { success: true, message: 'Status persetujuan dosen berhasil disimpan', data: updated });
        }

        // 11. Dashboard Aggregation Stats
        if (pathname === '/api/stats' && method === 'GET') {
            const stats = statsService.getDashboardStats();
            return sendJson(200, { success: true, data: stats });
        }

        // 12. XGBoost ML Service Integrations
        if (pathname === '/api/ml/health' && method === 'GET') {
            const health = await mlService.checkMlHealth();
            return sendJson(health.available ? 200 : 503, { success: health.available, data: health });
        }

        if (pathname === '/api/ml/predict' && method === 'POST') {
            const body = await parseBody();
            const result = await mlService.predictTicket(body);
            return sendJson(200, { success: true, data: result });
        }

        // 404 Not Found untuk endpoint API lainnya
        return sendJson(404, { success: false, error: `Endpoint API '${pathname}' [${method}] tidak ditemukan` });

    } catch (err) {
        console.error('[API ERROR]', err);
        return sendJson(500, { success: false, error: err.message });
    }
}

module.exports = { handleApiRequest };

