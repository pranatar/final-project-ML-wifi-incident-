/**
 * Service Penanganan Tiket Insiden Wi-Fi
 * Mengimplementasikan alur logika FR-01 s/d FR-05 dan Use Case UC-01, UC-04, UC-05
 */
const { getDb } = require('../db');

function getRooms() {
    const db = getDb();
    const stmt = db.prepare(`SELECT * FROM ruangan ORDER BY nama_gedung, nomor_lantai, nama_ruangan`);
    return stmt.all();
}

function getTickets(filter = {}) {
    const db = getDb();
    let query = `
        SELECT 
            t.*,
            p.nama AS nama_pelapor,
            p.email AS email_pelapor,
            p.no_whatsapp,
            r.nama_gedung,
            r.nama_ruangan,
            r.nomor_lantai,
            ap.ap_name,
            ap.ip_management,
            sd.no_surat,
            sd.token_verifikasi,
            sd.status_persetujuan_dosen
        FROM tiket_insiden t
        JOIN pengguna p ON t.user_id = p.user_id
        JOIN ruangan r ON t.id_ruangan = r.id_ruangan
        LEFT JOIN access_point ap ON t.ap_mac = ap.ap_mac
        LEFT JOIN surat_dispensasi sd ON t.no_tiket = sd.no_tiket
        WHERE 1=1
    `;
    const params = [];

    if (filter.status) {
        query += ` AND t.status_tiket = ?`;
        params.push(filter.status);
    }
    if (filter.prioritas) {
        query += ` AND t.prioritas = ?`;
        params.push(filter.prioritas);
    }
    if (filter.id_ruangan) {
        query += ` AND t.id_ruangan = ?`;
        params.push(filter.id_ruangan);
    }
    if (filter.userId) {
        query += ` AND t.user_id = ?`;
        params.push(filter.userId);
    }
    if (filter.search) {
        query += ` AND (t.no_tiket LIKE ? OR p.nama LIKE ? OR t.mata_kuliah LIKE ?)`;
        const q = `%${filter.search}%`;
        params.push(q, q, q);
    }

    query += ` ORDER BY t.waktu_lapor DESC`;

    if (filter.limit) {
        query += ` LIMIT ?`;
        params.push(Number(filter.limit));
    }

    const stmt = db.prepare(query);
    return stmt.all(...params);
}

function getTicketById(noTiket) {
    const db = getDb();
    const stmt = db.prepare(`
        SELECT 
            t.*,
            p.nama AS nama_pelapor,
            p.email AS email_pelapor,
            p.no_whatsapp,
            p.mac_address_default,
            r.nama_gedung,
            r.nama_ruangan,
            r.nomor_lantai,
            ap.ap_name,
            ap.ip_management,
            ap.model_ap,
            ap.status_operasional AS status_ap,
            sd.no_surat,
            sd.token_verifikasi,
            sd.status_persetujuan_dosen
        FROM tiket_insiden t
        JOIN pengguna p ON t.user_id = p.user_id
        JOIN ruangan r ON t.id_ruangan = r.id_ruangan
        LEFT JOIN access_point ap ON t.ap_mac = ap.ap_mac
        LEFT JOIN surat_dispensasi sd ON t.no_tiket = sd.no_tiket
        WHERE t.no_tiket = ?
    `);
    const ticket = stmt.get(noTiket);
    if (!ticket) return null;

    // Ambil riwayat tindakan teknis
    const stmtActions = db.prepare(`
        SELECT tp.*, p.nama AS operator_nama, p.peran AS operator_peran
        FROM tindakan_penanganan tp
        JOIN pengguna p ON tp.operator_id = p.user_id
        WHERE tp.no_tiket = ?
        ORDER BY tp.waktu_tindakan ASC
    `);
    ticket.riwayat_tindakan = stmtActions.all(noTiket);

    return ticket;
}

/**
 * Membuat tiket baru dengan algoritma deteksi Auto-Clustering cerdas (FR-02)
 */
function createTicket(data) {
    const db = getDb();

    // 1. Pastikan pengguna terdaftar atau buat profil sementara
    let user = db.prepare(`SELECT * FROM pengguna WHERE user_id = ?`).get(data.userId);
    if (!user) {
        db.prepare(`
            INSERT INTO pengguna (user_id, nama, email, no_whatsapp, peran)
            VALUES (?, ?, ?, ?, 'Mahasiswa')
        `).run(
            data.userId,
            data.namaPelapor || `Mahasiswa ${data.userId}`,
            data.emailPelapor || `${data.userId}@student.univ.ac.id`,
            data.noWhatsapp || '081200000000'
        );
    }

    // 2. Generate No Tiket Unik: TKT-YYYYMM-XXXX
    const now = new Date();
    const yearMonth = now.toISOString().slice(0, 7).replace('-', '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const noTiket = `TKT-${yearMonth}-${randomSuffix}`;

    // 3. Tentukan AP terkait berdasarkan ruangan jika apMac tidak disediakan
    let apMac = data.apMac;
    if (!apMac && data.idRuangan) {
        const apQuery = db.prepare(`SELECT ap_mac FROM access_point WHERE id_ruangan = ? LIMIT 1`).get(data.idRuangan);
        if (apQuery) apMac = apQuery.ap_mac;
    }

    // 4. Algoritma Korelasi & Auto-Clustering (FR-02 & UC-05)
    // Cek laporan lain dari ruangan yang sama dalam 15 menit terakhir
    const clusterCheck = db.prepare(`
        SELECT no_tiket, cluster_id, prioritas 
        FROM tiket_insiden 
        WHERE id_ruangan = ? 
          AND waktu_lapor >= datetime('now', '-15 minutes')
          AND status_tiket NOT IN ('RESOLVED', 'CLOSED')
    `).all(data.idRuangan);

    let isClustered = 0;
    let clusterId = null;
    let prioritas = data.isEmergencyDeadline ? 'P1-CRITICAL' : 'P2-HIGH';
    let statusTiket = 'OPEN';
    let kategoriMasalah = 'UNCLASSIFIED';

    if (clusterCheck.length >= 1) {
        // Terdeteksi insiden massal! (≥ 2 laporan dalam ruangan yang sama)
        isClustered = 1;
        clusterId = clusterCheck[0].cluster_id || `CLS-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${data.idRuangan}`;
        prioritas = 'P1-CRITICAL'; // Auto-elevate ke P1
        statusTiket = 'ESCALATED_NOC'; // Otomatis eskalasi langsung ke L2
        kategoriMasalah = 'AP_Overload';

        // Update tiket-tiket terdahulu di cluster ini ke status P1 jika belum
        db.prepare(`
            UPDATE tiket_insiden 
            SET is_clustered = 1, cluster_id = ?, prioritas = 'P1-CRITICAL', status_tiket = 'ESCALATED_NOC'
            WHERE id_ruangan = ? AND waktu_lapor >= datetime('now', '-15 minutes')
        `).run(clusterId, data.idRuangan);
    }

    // 5. Simpan Tiket ke Database
    db.prepare(`
        INSERT INTO tiket_insiden (
            no_tiket, user_id, id_ruangan, ap_mac, mata_kuliah, dosen_pengampu,
            deadline_tugas, gejala_gangguan, prioritas, status_tiket, kategori_masalah,
            is_clustered, cluster_id, url_bukti_screenshot, catatan_mahasiswa
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        noTiket,
        data.userId,
        data.idRuangan,
        apMac || null,
        data.mataKuliah || 'Tugas Kuliah Daring',
        data.dosenPengampu || 'Dosen Pengampu',
        data.deadlineTugas || null,
        data.gejalaGangguan || 'Koneksi Wi-Fi putus/gagal transmit',
        prioritas,
        statusTiket,
        kategoriMasalah,
        isClustered,
        clusterId,
        data.urlBuktiScreenshot || null,
        data.catatanMahasiswa || null
    );

    // 6. Log Tindakan Penanganan Awal
    const actionDesc = isClustered 
        ? `Auto-Clustering Aktif: Terdeteksi ${clusterCheck.length + 1} laporan dari ruangan yang sama. Sistem menaikkan prioritas ke P1-Critical dan meneruskan tiket ke NOC.`
        : `Pencatatan Tiket Baru via Self-Service Portal Mahasiswa.`;

    db.prepare(`
        INSERT INTO tindakan_penanganan (no_tiket, operator_id, aksi_teknis, catatan_teknis)
        VALUES (?, 'HD-001', 'Incident Triaging', ?)
    `).run(noTiket, actionDesc);

    return getTicketById(noTiket);
}

function updateTicketStatus(noTiket, status, operatorId, notes, technicalAction) {
    const db = getDb();
    const updateParams = [status];
    let query = `UPDATE tiket_insiden SET status_tiket = ?`;

    if (status === 'RESOLVED' || status === 'CLOSED') {
        query += `, waktu_selesai = datetime('now')`;
    }
    query += ` WHERE no_tiket = ?`;
    updateParams.push(noTiket);

    db.prepare(query).run(...updateParams);

    // Catat log tindakan
    if (operatorId) {
        db.prepare(`
            INSERT INTO tindakan_penanganan (no_tiket, operator_id, aksi_teknis, catatan_teknis)
            VALUES (?, ?, ?, ?)
        `).run(
            noTiket,
            operatorId,
            technicalAction || `Perubahan Status menjadi ${status}`,
            notes || `Status tiket diperbarui.`
        );
    }

    return getTicketById(noTiket);
}

module.exports = {
    getRooms,
    getTickets,
    getTicketById,
    createTicket,
    updateTicketStatus
};

