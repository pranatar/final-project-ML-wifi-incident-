/**
 * Service Surat Dispensasi Resmi Akademik (Digital Incident Certificate)
 * Mengimplementasikan FR-05 dan Use Case UC-08
 */
const { getDb } = require('../db');
const crypto = require('node:crypto');

function toRoman(num) {
    const lookup = { M:1000, CM:900, D:500, CD:400, C:100, XC:90, L:50, XL:40, X:10, IX:9, V:5, IV:4, I:1 };
    let roman = '';
    for (const i in lookup) {
        while (num >= lookup[i]) {
            roman += i;
            num -= lookup[i];
        }
    }
    return roman;
}

function createDispensation({ noTiket, namaMataKuliah, namaDosen, waktuMulaiGangguan, waktuSelesaiGangguan }) {
    const db = getDb();

    // 1. Ambil data tiket dan pelapor
    const ticketStmt = db.prepare(`
        SELECT t.*, p.nama AS nama_mahasiswa, p.email, r.nama_gedung, r.nama_ruangan, r.nomor_lantai
        FROM tiket_insiden t
        JOIN pengguna p ON t.user_id = p.user_id
        JOIN ruangan r ON t.id_ruangan = r.id_ruangan
        WHERE t.no_tiket = ?
    `);
    const ticket = ticketStmt.get(noTiket);
    if (!ticket) throw new Error(`Tiket dengan nomor ${noTiket} tidak ditemukan`);

    // 2. Cek apakah sudah ada surat sebelumnya
    const existing = db.prepare(`SELECT * FROM surat_dispensasi WHERE no_tiket = ?`).get(noTiket);
    if (existing) {
        return getDispensationByToken(existing.token_verifikasi);
    }

    // 3. Format nomor surat kedinasan: 421.3/UPT-TIK/SK-GANGGUAN/XI/2026-XXXX
    const now = new Date();
    const monthRoman = toRoman(now.getMonth() + 1);
    const year = now.getFullYear();
    const ticketSuffix = noTiket.replace(/^TKT-/, '');
    const noSurat = `421.3/UPT-TIK/SK-GANGGUAN/${monthRoman}/${year}-${ticketSuffix}`;

    // 4. Buat token verifikasi kriptografis
    const token = crypto.randomBytes(16).toString('hex');
    const qrUrl = `http://localhost:3000/api/dispensations/verify/${token}`;

    const waktuMulai = waktuMulaiGangguan || ticket.waktu_lapor;
    const waktuSelesai = waktuSelesaiGangguan || ticket.waktu_selesai || now.toISOString().replace('T', ' ').slice(0, 19);

    db.prepare(`
        INSERT INTO surat_dispensasi (
            no_surat, no_tiket, token_verifikasi, nama_mata_kuliah, nama_dosen,
            waktu_mulai_gangguan, waktu_selesai_gangguan, url_qr_verification, status_persetujuan_dosen
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'MENUNGGU_VERIFIKASI')
    `).run(
        noSurat,
        noTiket,
        token,
        namaMataKuliah || ticket.mata_kuliah,
        namaDosen || ticket.dosen_pengampu,
        waktuMulai,
        waktuSelesai,
        qrUrl
    );

    return getDispensationByToken(token);
}

function getDispensationByToken(token) {
    const db = getDb();
    const query = `
        SELECT 
            sd.*,
            t.gejala_gangguan,
            t.prioritas,
            t.status_tiket,
            t.ap_mac,
            p.user_id AS nim_mahasiswa,
            p.nama AS nama_mahasiswa,
            p.email AS email_mahasiswa,
            r.nama_gedung,
            r.nama_ruangan,
            r.nomor_lantai
        FROM surat_dispensasi sd
        JOIN tiket_insiden t ON sd.no_tiket = t.no_tiket
        JOIN pengguna p ON t.user_id = p.user_id
        JOIN ruangan r ON t.id_ruangan = r.id_ruangan
        WHERE sd.token_verifikasi = ?
    `;
    const res = db.prepare(query).get(token);
    if (!res) return null;

    res.is_valid = true;
    res.instansi_penerbit = 'Unit Pelaksana Teknis Teknologi Informasi dan Komunikasi (UPT TIK)';
    res.pejabat_penandatangan = 'Ir. H. Hendra Wijaya, M.T., CCNA';
    res.nip_pejabat = '19780415 200501 1 002';

    return res;
}

function updateApprovalStatus(token, statusPersetujuan) {
    const db = getDb();
    const validStatuses = ['MENUNGGU_VERIFIKASI', 'DISETUJUI', 'DITOLAK'];
    if (!validStatuses.includes(statusPersetujuan)) {
        throw new Error(`Status persetujuan tidak valid. Harus salah satu dari: ${validStatuses.join(', ')}`);
    }

    db.prepare(`
        UPDATE surat_dispensasi 
        SET status_persetujuan_dosen = ? 
        WHERE token_verifikasi = ?
    `).run(statusPersetujuan, token);

    return getDispensationByToken(token);
}

module.exports = {
    createDispensation,
    getDispensationByToken,
    updateApprovalStatus
};

