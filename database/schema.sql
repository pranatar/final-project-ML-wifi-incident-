-- ====================================================================
-- SKEMA BASIS DATA: SISTEM RESOLUSI GANGGUAN WI-FI KAMPUS (UPT TIK)
-- Standar Pemodelan: Mengacu pada Dokumen PEMODELAN_SISTEM_UML.md
-- Target RDBMS: SQLite 3 / PostgreSQL / MySQL Compatible
-- ====================================================================

PRAGMA foreign_keys = ON;

-- 1. TABEL PENGGUNA (MAHASISWA, HELPDESK, NOC, DOSEN)
CREATE TABLE IF NOT EXISTS pengguna (
    user_id VARCHAR(50) PRIMARY KEY, -- NIM Mahasiswa / NIP Staf
    nama VARCHAR(150) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    no_whatsapp VARCHAR(25) NOT NULL,
    peran VARCHAR(30) NOT NULL CHECK(peran IN ('Mahasiswa', 'Helpdesk_L1', 'Network_NOC_L2', 'Dosen', 'Admin')),
    mac_address_default VARCHAR(17), -- Format: XX:XX:XX:XX:XX:XX
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABEL RUANGAN (MASTER DATA RUANG KULIAH / LAB)
CREATE TABLE IF NOT EXISTS ruangan (
    id_ruangan VARCHAR(50) PRIMARY KEY, -- Contoh: GD-B-LT2-LAB03
    nama_gedung VARCHAR(100) NOT NULL,
    nomor_lantai INTEGER NOT NULL,
    nama_ruangan VARCHAR(100) NOT NULL,
    kapasitas_mahasiswa INTEGER DEFAULT 40,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABEL ACCESS POINT (INVENTARIS DAN STATUS OPERASIONAL AP)
CREATE TABLE IF NOT EXISTS access_point (
    ap_mac VARCHAR(17) PRIMARY KEY, -- MAC Address AP
    ap_name VARCHAR(100) NOT NULL UNIQUE, -- Contoh: AP-GedB-L2-01
    id_ruangan VARCHAR(50) NOT NULL,
    ip_management VARCHAR(45) NOT NULL,
    model_ap VARCHAR(100) DEFAULT 'Cisco Catalyst 9120AX',
    max_client_limit INTEGER DEFAULT 50,
    channel_24ghz INTEGER DEFAULT 6,
    channel_5ghz INTEGER DEFAULT 36,
    tx_power_dbm INTEGER DEFAULT 20,
    status_operasional VARCHAR(20) DEFAULT 'ONLINE' CHECK(status_operasional IN ('ONLINE', 'DEGRADED', 'OVERLOADED', 'OFFLINE')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_ruangan) REFERENCES ruangan(id_ruangan) ON DELETE CASCADE
);

-- 4. TABEL TIKET INSIDEN (PELAPORAN GANGGUAN MAHASISWA)
CREATE TABLE IF NOT EXISTS tiket_insiden (
    no_tiket VARCHAR(50) PRIMARY KEY, -- Contoh: TKT-202611-0042
    user_id VARCHAR(50) NOT NULL,
    id_ruangan VARCHAR(50) NOT NULL,
    ap_mac VARCHAR(17),
    mata_kuliah VARCHAR(100) NOT NULL,
    dosen_pengampu VARCHAR(150) NOT NULL,
    deadline_tugas DATETIME,
    gejala_gangguan VARCHAR(255) NOT NULL,
    prioritas VARCHAR(20) DEFAULT 'P3-NORMAL' CHECK(prioritas IN ('P1-CRITICAL', 'P2-HIGH', 'P3-NORMAL')),
    status_tiket VARCHAR(30) DEFAULT 'OPEN' CHECK(status_tiket IN ('OPEN', 'PENDING_TRIASE', 'ESCALATED_NOC', 'IN_REMEDIATION', 'RESOLVED', 'CLOSED')),
    kategori_masalah VARCHAR(50) DEFAULT 'UNCLASSIFIED' CHECK(kategori_masalah IN ('AP_Overload', 'DHCP_Exhausted', 'Client_Config', 'RF_Noise', 'Gateway_Timeout', 'UNCLASSIFIED')),
    is_clustered BOOLEAN DEFAULT 0, -- 1 jika bagian dari insiden massal di ruangan yang sama
    cluster_id VARCHAR(50),
    url_bukti_screenshot TEXT,
    catatan_mahasiswa TEXT,
    waktu_lapor DATETIME DEFAULT CURRENT_TIMESTAMP,
    waktu_selesai DATETIME,
    FOREIGN KEY (user_id) REFERENCES pengguna(user_id),
    FOREIGN KEY (id_ruangan) REFERENCES ruangan(id_ruangan),
    FOREIGN KEY (ap_mac) REFERENCES access_point(ap_mac)
);

-- 5. TABEL LOG TELEMETRI ACCESS POINT (TIME-SERIES METRICS)
CREATE TABLE IF NOT EXISTS log_telemetri_ap (
    id_log INTEGER PRIMARY KEY AUTOINCREMENT,
    ap_mac VARCHAR(17) NOT NULL,
    timestamp_perekaman DATETIME DEFAULT CURRENT_TIMESTAMP,
    connected_clients INTEGER NOT NULL,
    clients_24ghz INTEGER DEFAULT 0,
    clients_5ghz INTEGER DEFAULT 0,
    cpu_utilization REAL DEFAULT 0.0, -- Persentase (0-100%)
    memory_utilization REAL DEFAULT 0.0,
    packet_loss_ratio REAL DEFAULT 0.0, -- Persentase (0-100%)
    latency_gateway_ms REAL DEFAULT 5.0,
    dhcp_pool_remaining INTEGER DEFAULT 200,
    FOREIGN KEY (ap_mac) REFERENCES access_point(ap_mac) ON DELETE CASCADE
);

-- 6. TABEL TINDAKAN PENANGANAN (AUDIT LOG OPERATOR HELPDESK & NOC)
CREATE TABLE IF NOT EXISTS tindakan_penanganan (
    id_tindakan INTEGER PRIMARY KEY AUTOINCREMENT,
    no_tiket VARCHAR(50) NOT NULL,
    operator_id VARCHAR(50) NOT NULL,
    waktu_tindakan DATETIME DEFAULT CURRENT_TIMESTAMP,
    aksi_teknis VARCHAR(100) NOT NULL, -- Contoh: 'Dynamic Client Steering', 'Flush Inactive Leases', 'Adjust Tx Power'
    catatan_teknis TEXT,
    hasil_ping_ms REAL,
    FOREIGN KEY (no_tiket) REFERENCES tiket_insiden(no_tiket) ON DELETE CASCADE,
    FOREIGN KEY (operator_id) REFERENCES pengguna(user_id)
);

-- 7. TABEL SURAT DISPENSASI (DIGITAL INCIDENT CERTIFICATE AKADEMIK)
CREATE TABLE IF NOT EXISTS surat_dispensasi (
    no_surat VARCHAR(100) PRIMARY KEY, -- Format: 421.3/UPT-TIK/SK-GANGGUAN/XI/2026
    no_tiket VARCHAR(50) UNIQUE NOT NULL,
    token_verifikasi VARCHAR(64) UNIQUE NOT NULL,
    nama_mata_kuliah VARCHAR(100) NOT NULL,
    nama_dosen VARCHAR(150) NOT NULL,
    waktu_mulai_gangguan DATETIME NOT NULL,
    waktu_selesai_gangguan DATETIME NOT NULL,
    diterbitkan_oleh VARCHAR(150) DEFAULT 'Ir. H. Hendra Wijaya, M.T., CCNA (Kepala UPT TIK)',
    status_persetujuan_dosen VARCHAR(30) DEFAULT 'MENUNGGU_VERIFIKASI' CHECK(status_persetujuan_dosen IN ('MENUNGGU_VERIFIKASI', 'DISETUJUI', 'DITOLAK')),
    url_qr_verification TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (no_tiket) REFERENCES tiket_insiden(no_tiket) ON DELETE CASCADE
);

-- ====================================================================
-- INDEKS PERFORMA (DATABASE OPTIMIZATION)
-- Sesuai Bab 6.B PEMODELAN_SISTEM_UML.md
-- ====================================================================

-- Indeks komposit untuk mempercepat algoritma deteksi Auto-Clustering (< 100ms)
CREATE INDEX IF NOT EXISTS idx_tiket_ruangan_waktu ON tiket_insiden(id_ruangan, waktu_lapor);

-- Indeks status tiket untuk query dashboard Helpdesk & NOC
CREATE INDEX IF NOT EXISTS idx_tiket_status_prioritas ON tiket_insiden(status_tiket, prioritas);

-- Indeks time-series untuk telemetri heatmap AP
CREATE INDEX IF NOT EXISTS idx_telemetri_ap_waktu ON log_telemetri_ap(ap_mac, timestamp_perekaman);

-- Indeks token verifikasi surat dispensasi
CREATE INDEX IF NOT EXISTS idx_surat_token ON surat_dispensasi(token_verifikasi);

