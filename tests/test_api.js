/**
 * Automated Test Suite untuk Backend API Sistem Resolusi Wi-Fi Kampus
 * Memverifikasi integritas endpoint, alur auto-clustering P1, dan siklus hidup tiket
 */
const http = require('node:http');
const assert = require('node:assert');
const server = require('../server');
const { getDb } = require('../src/db');

const BASE_URL = 'http://localhost:3000';
let serverStartedByTest = false;

function ensureServerRunning() {
    return new Promise((resolve) => {
        const req = http.get(`${BASE_URL}/api/health`, (res) => {
            // Server sudah menyala di background
            resolve();
        });
        req.on('error', () => {
            // Nyalakan server untuk pengetesan jika belum ada yang listen
            server.listen(3000, () => {
                serverStartedByTest = true;
                resolve();
            });
        });
    });
}

function request(path, options = {}, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const reqOptions = {
            method: options.method || 'GET',
            headers: options.headers || {}
        };
        if (body) {
            reqOptions.headers['Content-Type'] = 'application/json';
        }

        const req = http.request(url, reqOptions, (res) => {
            let resData = '';
            res.on('data', chunk => resData += chunk);
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(resData);
                } catch {
                    parsed = resData;
                }
                resolve({ status: res.statusCode, data: parsed, headers: res.headers });
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTests() {
    console.log(`\n======================================================`);
    console.log(`🧪 MENJALANKAN AUTOMATED TEST SUITE API BACKEND`);
    console.log(`======================================================\n`);

    await ensureServerRunning();

    // Bersihkan data tiket uji coba di ruangan GD-C-LT3-LAB02 agar pengujian selalu idempotent
    getDb().prepare(`DELETE FROM tiket_insiden WHERE id_ruangan = 'GD-C-LT3-LAB02'`).run();

    let passed = 0;
    let failed = 0;

    const test = async (name, fn) => {
        try {
            process.stdout.write(`⏳ Menguji: ${name} ... `);
            await fn();
            console.log(`✅ [LULUS]`);
            passed++;
        } catch (err) {
            console.log(`❌ [GAGAL]`);
            console.error(`   Alasan:`, err.message);
            failed++;
        }
    };

    // Test 1: Health Check
    await test('GET /api/health (Status Server)', async () => {
        const res = await request('/api/health');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.status, 'UP');
    });

    // Test 2: Master Data Ruangan
    await test('GET /api/rooms (Daftar Ruangan Kampus)', async () => {
        const res = await request('/api/rooms');
        assert.strictEqual(res.status, 200);
        assert.ok(Array.isArray(res.data.data));
        assert.ok(res.data.data.length >= 4);
    });

    // Test 3: Telemetri Access Points
    await test('GET /api/access-points (Telemetri AP)', async () => {
        const res = await request('/api/access-points');
        assert.strictEqual(res.status, 200);
        assert.ok(Array.isArray(res.data.data));
        const apLab3 = res.data.data.find(a => a.ap_mac === '44:D9:E7:88:A1:03');
        assert.ok(apLab3, 'AP Lab 3 harus terdaftar');
    });

    // Test 4: Dashboard Stats
    await test('GET /api/stats (Ringkasan Metrik NOC)', async () => {
        const res = await request('/api/stats');
        assert.strictEqual(res.status, 200);
        assert.ok(res.data.data.totalTicketsToday >= 0);
        assert.ok(res.data.data.activeClients.total >= 0);
    });

    // Test 5: Buat Tiket Mahasiswa Pertama (Single Issue)
    let ticket1No = null;
    await test('POST /api/tickets (Pelaporan Tiket Tunggal)', async () => {
        const payload = {
            userId: '220101089',
            idRuangan: 'GD-C-LT3-LAB02',
            mataKuliah: 'Sains Data Lanjut',
            dosenPengampu: 'Prof. Bambang Sutrisno',
            gejalaGangguan: 'Latency tinggi saat train notebook online',
            isEmergencyDeadline: false
        };
        const res = await request('/api/tickets', { method: 'POST' }, payload);
        assert.strictEqual(res.status, 201);
        assert.ok(res.data.data.no_tiket);
        ticket1No = res.data.data.no_tiket;
        assert.strictEqual(res.data.data.is_clustered, 0);
    });

    // Test 6: Buat Tiket Mahasiswa Kedua di Ruangan Sama (Auto-Clustering & P1 Critical Elevation)
    let ticket2No = null;
    await test('POST /api/tickets (Auto-Clustering & P1 Escalation)', async () => {
        const payload = {
            userId: '220101045',
            idRuangan: 'GD-C-LT3-LAB02',
            mataKuliah: 'Sains Data Lanjut',
            dosenPengampu: 'Prof. Bambang Sutrisno',
            gejalaGangguan: 'Koneksi terputus total saat upload model',
            isEmergencyDeadline: true
        };
        const res = await request('/api/tickets', { method: 'POST' }, payload);
        assert.strictEqual(res.status, 201);
        ticket2No = res.data.data.no_tiket;
        assert.strictEqual(res.data.data.is_clustered, 1, 'Harus terdeteksi sebagai clustered!');
        assert.strictEqual(res.data.data.prioritas, 'P1-CRITICAL', 'Harus otomatis naik ke P1!');
        assert.strictEqual(res.data.data.status_tiket, 'ESCALATED_NOC', 'Harus otomatis eskalasi ke NOC!');
    });

    // Test 7: Remediasi NOC (Load Balancing & Auto-Resolution)
    await test('POST /api/remediation (Remediasi Beban AP & Auto-Resolve Tiket)', async () => {
        const payload = {
            apMac: '44:D9:E7:88:A1:03',
            operatorId: 'NOC-002',
            actionType: 'DYNAMIC_LOAD_BALANCING'
        };
        const res = await request('/api/remediation', { method: 'POST' }, payload);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.data.newStatus, 'ONLINE');
        assert.strictEqual(res.data.data.metrics.packetLoss, 0);
    });

    // Test 8: Generate Surat Keterangan Gangguan Resmi (Digital Certificate)
    let verificationToken = null;
    await test('POST /api/dispensations (Penerbitan Surat Dispensasi Resmi)', async () => {
        const payload = {
            noTiket: ticket1No,
            namaMataKuliah: 'Jaringan Komputer Lanjut',
            namaDosen: 'Dr. Eng. Wahyu Pratama, M.Kom.'
        };
        const res = await request('/api/dispensations', { method: 'POST' }, payload);
        assert.strictEqual(res.status, 201);
        assert.ok(res.data.data.no_surat);
        assert.ok(res.data.data.token_verifikasi);
        verificationToken = res.data.data.token_verifikasi;
    });

    // Test 9: Verifikasi Surat via Token QR
    await test('GET /api/dispensations/verify/:token (Verifikasi Keaslian QR)', async () => {
        const res = await request(`/api/dispensations/verify/${verificationToken}`);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.valid, true);
        assert.strictEqual(res.data.data.nim_mahasiswa, '220101089');
    });

    // Test 10: Persetujuan Dosen atas Surat Dispensasi
    await test('PATCH /api/dispensations/verify/:token/approve (Persetujuan Dosen)', async () => {
        const payload = { status: 'DISETUJUI' };
        const res = await request(`/api/dispensations/verify/${verificationToken}/approve`, { method: 'PATCH' }, payload);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.data.status_persetujuan_dosen, 'DISETUJUI');
    });

    // Test 11: Endpoint Jembatan Machine Learning XGBoost
    await test('POST /api/ml/predict (Prediksi Prioritas & SLA XGBoost)', async () => {
        const payload = {
            connectedClients: 65,
            cpuUtilization: 94.2,
            packetLossRatio: 12.8,
            isEmergencyDeadline: true,
            clusterCount: 2,
            isClustered: true
        };
        const res = await request('/api/ml/predict', { method: 'POST' }, payload);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.success, true);
        assert.ok(res.data.data.model.includes('XGBoost'));
    });

    console.log(`\n======================================================`);
    console.log(`📊 HASIL PENGUJIAN: ${passed} LULUS, ${failed} GAGAL`);
    console.log(`======================================================\n`);

    if (serverStartedByTest && server.listening) {
        server.close();
    }
    process.exit(failed > 0 ? 1 : 0);
}

runTests();
