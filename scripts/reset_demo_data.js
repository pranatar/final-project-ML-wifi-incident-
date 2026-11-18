const { getDb } = require('../src/db');
const db = getDb();

db.exec(`
  DELETE FROM tiket_insiden;
  DELETE FROM tindakan_penanganan;
  DELETE FROM surat_dispensasi;
  UPDATE access_point SET status_operasional = 'ONLINE';
  DELETE FROM log_telemetri_ap;

  INSERT INTO log_telemetri_ap (
    ap_mac, timestamp_perekaman, connected_clients, clients_24ghz, clients_5ghz,
    cpu_utilization, memory_utilization, packet_loss_ratio, latency_gateway_ms, dhcp_pool_remaining
  ) VALUES
  ('44:D9:E7:88:A1:03', datetime('now'), 0, 0, 0, 15.0, 28.0, 0.0, 4.0, 250),
  ('44:D9:E7:88:A1:04', datetime('now'), 0, 0, 0, 12.0, 22.0, 0.0, 3.5, 250),
  ('44:D9:E7:88:A1:01', datetime('now'), 0, 0, 0, 14.0, 25.0, 0.0, 4.2, 250),
  ('44:D9:E7:88:A1:09', datetime('now'), 0, 0, 0, 10.0, 20.0, 0.0, 3.8, 250);
`);

console.log('RESET SUKSES: Database sekarang bersih di angka 0 untuk demo!');
