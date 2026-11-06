-- ====================================================================
-- SEED DATA: SISTEM RESOLUSI GANGGUAN WI-FI KAMPUS (UPT TIK)
-- Data Awal Realistis untuk Skenario Pengujian & Prototipe Sistem
-- ====================================================================

-- 1. SEED PENGGUNA
INSERT OR IGNORE INTO pengguna (user_id, nama, email, no_whatsapp, peran, mac_address_default) VALUES
('220101089', 'Ahmad Fauzi', 'ahmad.fauzi@student.univ.ac.id', '081298765432', 'Mahasiswa', '3C:22:FB:41:A8:10'),
('220101045', 'Siti Rahmawati', 'siti.rahma@student.univ.ac.id', '081234567890', 'Mahasiswa', '48:5F:99:12:D4:56'),
('220101112', 'Dimas Prasetyo', 'dimas.p@student.univ.ac.id', '085711223344', 'Mahasiswa', '7C:D1:C3:9A:88:21'),
('HD-001', 'Hendra Kusuma', 'hendra.helpdesk@univ.ac.id', '082100010001', 'Helpdesk_L1', 'A0:B1:C2:D3:E4:F5'),
('NOC-002', 'Rian Pratama, S.Kom.', 'rian.noc@univ.ac.id', '082100020002', 'Network_NOC_L2', 'B0:C1:D2:E3:F4:01'),
('DSN-101', 'Dr. Eng. Wahyu Pratama, M.Kom.', 'wahyu.pratama@univ.ac.id', '081199887766', 'Dosen', NULL);

-- 2. SEED RUANGAN KAMPUS
INSERT OR IGNORE INTO ruangan (id_ruangan, nama_gedung, nomor_lantai, nama_ruangan, kapasitas_mahasiswa) VALUES
('GD-B-LT2-LAB03', 'Gedung B (Fakultas Teknik)', 2, 'Lab Komputer 3', 40),
('GD-B-LT2-LAB01', 'Gedung B (Fakultas Teknik)', 2, 'Lab Komputer 1', 40),
('GD-B-LT2-KORIDOR', 'Gedung B (Fakultas Teknik)', 2, 'Koridor Lantai 2', 60),
('GD-A-LT1-R101', 'Gedung A (Gedung Utama)', 1, 'Ruang Kuliah 101', 50),
('GD-C-LT3-LAB02', 'Gedung C (Sains Data)', 3, 'Lab Jaringan & IoT', 35),
('GD-LIB-LT1-MAIN', 'Perpustakaan Pusat', 1, 'Area Baca Mandiri Lt. 1', 80);

-- 3. SEED ACCESS POINT (AP)
INSERT OR IGNORE INTO access_point (ap_mac, ap_name, id_ruangan, ip_management, model_ap, max_client_limit, channel_24ghz, channel_5ghz, tx_power_dbm, status_operasional) VALUES
('44:D9:E7:88:A1:03', 'AP-GedB-L2-01 (Lab 3)', 'GD-B-LT2-LAB03', '10.20.2.11', 'Cisco Catalyst 9120AX', 50, 6, 36, 23, 'OVERLOADED'),
('44:D9:E7:88:A1:04', 'AP-GedB-L2-Koridor', 'GD-B-LT2-KORIDOR', '10.20.2.12', 'Cisco Catalyst 9120AX', 50, 11, 48, 18, 'ONLINE'),
('44:D9:E7:88:A1:01', 'AP-GedA-L1-01', 'GD-A-LT1-R101', '10.20.1.10', 'Aruba AP-535', 60, 1, 52, 17, 'ONLINE'),
('44:D9:E7:88:A1:09', 'AP-Perpus-01', 'GD-LIB-LT1-MAIN', '10.20.5.15', 'UniFi U6 Pro', 75, 6, 149, 19, 'ONLINE');

-- 4. SEED TIKET INSIDEN AKTIF
INSERT OR IGNORE INTO tiket_insiden (
    no_tiket, user_id, id_ruangan, ap_mac, mata_kuliah, dosen_pengampu, 
    deadline_tugas, gejala_gangguan, prioritas, status_tiket, kategori_masalah, 
    is_clustered, cluster_id, catatan_mahasiswa, waktu_lapor
) VALUES
(
    'TKT-202611-0042', '220101089', 'GD-B-LT2-LAB03', '44:D9:E7:88:A1:03',
    'Jaringan Komputer Lanjut', 'Dr. Eng. Wahyu Pratama, M.Kom.',
    datetime('now', '+35 minutes'),
    'Koneksi Wi-Fi putus mendadak dan Request Timed Out saat upload file laporan tugas akhir di LMS.',
    'P1-CRITICAL', 'ESCALATED_NOC', 'AP_Overload',
    1, 'CLS-20261104-LAB03',
    'Tugas memiliki deadline ketat pukul 10:00 WIB. Mohon segera dibantu reset koneksi.',
    datetime('now', '-12 minutes')
),
(
    'TKT-202611-0043', '220101045', 'GD-B-LT2-LAB03', '44:D9:E7:88:A1:03',
    'Jaringan Komputer Lanjut', 'Dr. Eng. Wahyu Pratama, M.Kom.',
    datetime('now', '+35 minutes'),
    'Gagal re-autentikasi Captive portal, halaman login terus berputar (stuck loading).',
    'P1-CRITICAL', 'ESCALATED_NOC', 'AP_Overload',
    1, 'CLS-20261104-LAB03',
    'Teman-teman satu baris meja di Lab 3 juga mengalami masalah yang sama.',
    datetime('now', '-8 minutes')
),
(
    'TKT-202611-0039', '220101112', 'GD-A-LT1-R101', '44:D9:E7:88:A1:01',
    'Pemrograman Web Dasar', 'Sari Indrawati, M.T.',
    datetime('now', '+120 minutes'),
    'Koneksi lambat saat unduh modul praktikum PDF.',
    'P3-NORMAL', 'OPEN', 'Client_Config',
    0, NULL,
    'Sinyal terdeteksi 3 bar, namun transfer rate rendah.',
    datetime('now', '-45 minutes')
);

-- 5. SEED LOG TELEMETRI ACCESS POINT
INSERT OR IGNORE INTO log_telemetri_ap (
    ap_mac, timestamp_perekaman, connected_clients, clients_24ghz, clients_5ghz,
    cpu_utilization, memory_utilization, packet_loss_ratio, latency_gateway_ms, dhcp_pool_remaining
) VALUES
('44:D9:E7:88:A1:03', datetime('now', '-10 minutes'), 65, 42, 23, 94.2, 88.5, 12.8, 145.0, 2),
('44:D9:E7:88:A1:04', datetime('now', '-10 minutes'), 12, 4, 8, 22.0, 35.1, 0.0, 6.2, 188),
('44:D9:E7:88:A1:01', datetime('now', '-10 minutes'), 21, 8, 13, 31.4, 40.2, 0.2, 9.4, 150),
('44:D9:E7:88:A1:09', datetime('now', '-10 minutes'), 34, 10, 24, 45.0, 52.0, 0.5, 11.0, 95);

-- 6. SEED TINDAKAN PENANGANAN AWAL
INSERT OR IGNORE INTO tindakan_penanganan (
    no_tiket, operator_id, waktu_tindakan, aksi_teknis, catatan_teknis, hasil_ping_ms
) VALUES
(
    'TKT-202611-0042', 'HD-001', datetime('now', '-10 minutes'),
    'Verifikasi Tiket & Auto-Clustering',
    'Terdeteksi 2 laporan masuk serentak dari Lab 3. Tiket dielevasi ke status P1-Critical dan diteruskan ke NOC.',
    145.0
);

-- 7. SEED CONTOH SURAT DISPENSASI SIAP VERIFIKASI
INSERT OR IGNORE INTO surat_dispensasi (
    no_surat, no_tiket, token_verifikasi, nama_mata_kuliah, nama_dosen,
    waktu_mulai_gangguan, waktu_selesai_gangguan, status_persetujuan_dosen, url_qr_verification
) VALUES
(
    '421.3/UPT-TIK/SK-GANGGUAN/XI/2026-0042',
    'TKT-202611-0042',
    'a9f8b472e3d16c94aa734e5b61c28f92',
    'Jaringan Komputer Lanjut',
    'Dr. Eng. Wahyu Pratama, M.Kom.',
    datetime('now', '-45 minutes'),
    datetime('now', '-10 minutes'),
    'MENUNGGU_VERIFIKASI',
    'http://localhost:3000/api/dispensations/verify/a9f8b472e3d16c94aa734e5b61c28f92'
);

