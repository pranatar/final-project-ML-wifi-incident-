const { getDb } = require('../src/db');
const db = getDb();

// 1. Bersihkan transaksi demo tiket & tindakan
db.exec(`
  DELETE FROM tiket_insiden;
  DELETE FROM tindakan_penanganan;
  DELETE FROM surat_dispensasi;
  DELETE FROM log_telemetri_ap;
`);

// 2. Perbarui master data ruangan & Access Point untuk Universitas Klabat (UNKLAB)
db.exec(`
  DELETE FROM access_point;
  DELETE FROM ruangan;

  INSERT INTO ruangan (id_ruangan, nama_gedung, nomor_lantai, nama_ruangan, kapasitas_mahasiswa) VALUES
  ('GD-B-LT2-LAB03', 'Gedung Fakultas Ilmu Komputer (FIK)', 2, 'Lab Komputer 3 (FIK Lt. 2)', 40),
  ('GD-B-LT2-LAB01', 'Gedung Fakultas Ilmu Komputer (FIK)', 2, 'Lab Pemrograman 1', 40),
  ('GD-B-LT2-KORIDOR', 'Gedung Fakultas Ilmu Komputer (FIK)', 2, 'Lobi & Koridor Lt. 2', 60),
  ('GD-A-LT1-R101', 'Gedung Pioneer Chapel & Hall', 1, 'Auditorium Pioneer Lt. 1', 120),
  ('GD-C-LT3-LAB02', 'Gedung GK2 (Graha Klabat)', 3, 'Lab Jaringan Komputer GK2', 35),
  ('GD-LIB-LT1-MAIN', 'Fernandez Memorial Library', 1, 'Area Belajar Mandiri Perpustakaan', 80);

  INSERT INTO access_point (ap_mac, ap_name, id_ruangan, ip_management, model_ap, max_client_limit, channel_24ghz, channel_5ghz, tx_power_dbm, status_operasional) VALUES
  ('44:D9:E7:88:A1:03', 'AP-FIK-L2-Lab3', 'GD-B-LT2-LAB03', '10.20.2.11', 'Cisco Catalyst 9120AX', 50, 6, 36, 23, 'ONLINE'),
  ('44:D9:E7:88:A1:04', 'AP-FIK-L2-Lobi', 'GD-B-LT2-KORIDOR', '10.20.2.12', 'Cisco Catalyst 9120AX', 50, 11, 48, 18, 'ONLINE'),
  ('44:D9:E7:88:A1:01', 'AP-Pioneer-01', 'GD-A-LT1-R101', '10.20.1.10', 'Aruba AP-535', 60, 1, 52, 17, 'ONLINE'),
  ('44:D9:E7:88:A1:09', 'AP-Perpus-Fernandez', 'GD-LIB-LT1-MAIN', '10.20.5.15', 'UniFi U6 Pro', 75, 6, 149, 19, 'ONLINE');

  INSERT INTO log_telemetri_ap (
    ap_mac, timestamp_perekaman, connected_clients, clients_24ghz, clients_5ghz,
    cpu_utilization, memory_utilization, packet_loss_ratio, latency_gateway_ms, dhcp_pool_remaining
  ) VALUES
  ('44:D9:E7:88:A1:03', datetime('now'), 0, 0, 0, 15.0, 28.0, 0.0, 4.0, 250),
  ('44:D9:E7:88:A1:04', datetime('now'), 0, 0, 0, 12.0, 22.0, 0.0, 3.5, 250),
  ('44:D9:E7:88:A1:01', datetime('now'), 0, 0, 0, 14.0, 25.0, 0.0, 4.2, 250),
  ('44:D9:E7:88:A1:09', datetime('now'), 0, 0, 0, 10.0, 20.0, 0.0, 3.8, 250);
`);

console.log('RESET SUKSES: Database Universitas Klabat (UNKLAB) siap dalam kondisi bersih 0 data!');

