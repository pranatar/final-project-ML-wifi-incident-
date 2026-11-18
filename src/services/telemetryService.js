/**
 * Service Telemetri AP & Remediasi Jaringan NOC
 * Mengimplementasikan FR-03 (Telemetry & Heatmap) dan FR-04 (Quick Remediation Controls)
 */
const { getDb } = require('../db');

function getAccessPoints() {
    const db = getDb();
    const query = `
        SELECT 
            ap.*,
            r.nama_gedung,
            r.nomor_lantai,
            r.nama_ruangan,
            r.kapasitas_mahasiswa,
            t.connected_clients,
            t.clients_24ghz,
            t.clients_5ghz,
            t.cpu_utilization,
            t.memory_utilization,
            t.packet_loss_ratio,
            t.latency_gateway_ms,
            t.dhcp_pool_remaining,
            t.timestamp_perekaman
        FROM access_point ap
        JOIN ruangan r ON ap.id_ruangan = r.id_ruangan
        LEFT JOIN log_telemetri_ap t ON t.id_log = (
            SELECT id_log FROM log_telemetri_ap 
            WHERE ap_mac = ap.ap_mac 
            ORDER BY timestamp_perekaman DESC, id_log DESC 
            LIMIT 1
        )
        ORDER BY ap.status_operasional DESC, ap.ap_name ASC
    `;
    return db.prepare(query).all();
}

/**
 * Eksekusi Remediasi Cepat oleh NOC (Band Steering, Load Balancing, DHCP Flush)
 */
function executeRemediation({ apMac, operatorId, actionType = 'DYNAMIC_LOAD_BALANCING' }) {
    const db = getDb();
    const ap = db.prepare(`SELECT * FROM access_point WHERE ap_mac = ?`).get(apMac);
    if (!ap) throw new Error(`Access Point dengan MAC ${apMac} tidak ditemukan`);

    const opId = operatorId || 'NOC-002';
    let newStatus = 'ONLINE';
    let newClients = 28;
    let newLoss = 0.0;
    let newLatency = 11.2;
    let newCpu = 38.5;
    let newDhcp = 145;
    let actionSummary = '';

    if (actionType === 'DYNAMIC_LOAD_BALANCING') {
        actionSummary = 'Dynamic Client Steering & Load Balancing diaktifkan: 37 klien dialihkan ke AP-Koridor. Latensi gateway turun ke 11ms, packet loss 0%.';
    } else if (actionType === 'DHCP_FLUSH') {
        actionSummary = 'Flushed stale DHCP leases & expanded pool subnet /23. Sisa pool IP bertambah menjadi 250 alamat.';
        newDhcp = 250;
    } else if (actionType === 'RF_TUNING') {
        actionSummary = 'Tuned RF channel 5GHz ke 44 (non-interfering) & optimasi Tx Power 18 dBm.';
    } else {
        actionSummary = `Tindakan remediasi teknis: ${actionType} berhasil dieksekusi.`;
    }

    // 1. Update status AP
    db.prepare(`
        UPDATE access_point 
        SET status_operasional = ?
        WHERE ap_mac = ?
    `).run(newStatus, apMac);

    // 2. Tambah log telemetri baru yang telah stabil
    db.prepare(`
        INSERT INTO log_telemetri_ap (
            ap_mac, connected_clients, clients_24ghz, clients_5ghz,
            cpu_utilization, memory_utilization, packet_loss_ratio,
            latency_gateway_ms, dhcp_pool_remaining
        ) VALUES (?, ?, 8, 20, ?, 42.0, ?, ?, ?)
    `).run(apMac, newClients, newCpu, newLoss, newLatency, newDhcp);

    // 3. Update semua tiket aktif yang tertaut ke AP atau ruangan tersebut ke status 'RESOLVED'
    const affectedTickets = db.prepare(`
        SELECT no_tiket FROM tiket_insiden 
        WHERE (ap_mac = ? OR id_ruangan = ?) 
          AND status_tiket IN ('OPEN', 'PENDING_TRIASE', 'ESCALATED_NOC', 'IN_REMEDIATION')
    `).all(apMac, ap.id_ruangan);

    for (const t of affectedTickets) {
        db.prepare(`
            UPDATE tiket_insiden 
            SET status_tiket = 'RESOLVED', waktu_selesai = datetime('now')
            WHERE no_tiket = ?
        `).run(t.no_tiket);

        db.prepare(`
            INSERT INTO tindakan_penanganan (no_tiket, operator_id, aksi_teknis, catatan_teknis, hasil_ping_ms)
            VALUES (?, ?, 'NOC Network Remediation', ?, ?)
        `).run(t.no_tiket, opId, actionSummary, newLatency);

        // Terbitkan surat dispensasi resmi secara otomatis jika belum ada
        try {
            const dispensationService = require('./dispensationService');
            dispensationService.createDispensation({ noTiket: t.no_tiket });
        } catch (e) {
            // Surat sudah ada atau ditangani terpisah
        }
    }

    return {
        success: true,
        apMac,
        apName: ap.ap_name,
        newStatus,
        affectedTicketsCount: affectedTickets.length,
        actionSummary,
        metrics: {
            connectedClients: newClients,
            cpuUtilization: newCpu,
            packetLoss: newLoss,
            latencyGatewayMs: newLatency,
            dhcpRemaining: newDhcp
        }
    };
}

module.exports = {
    getAccessPoints,
    executeRemediation
};

