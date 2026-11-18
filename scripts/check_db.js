const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('./database/wifi_incident.db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name).join(', '));

try {
    const ap = db.prepare('SELECT ap_mac, ap_name, id_ruangan, status_operasional FROM access_point').all();
    console.log('\nAPs:', JSON.stringify(ap, null, 2));
} catch(e) { console.log('AP table error:', e.message); }

try {
    const tele = db.prepare('SELECT * FROM log_telemetri_ap ORDER BY id_log DESC LIMIT 5').all();
    console.log('\nTelemetry (last 5):', JSON.stringify(tele, null, 2));
} catch(e) { console.log('Telemetry table error:', e.message); }

try {
    const tickets = db.prepare('SELECT no_tiket, status_tiket, prioritas, ap_mac FROM tiket_insiden ORDER BY waktu_lapor DESC LIMIT 5').all();
    console.log('\nTickets (last 5):', JSON.stringify(tickets, null, 2));
} catch(e) { console.log('Tickets table error:', e.message); }

db.close();
