/**
 * Inisialisasi Basis Data SQLite: wifi_incident.db
 * Mengeksekusi schema.sql dan seed.sql menggunakan modul native node:sqlite (Node.js 22+)
 */
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const DB_PATH = path.join(__dirname, 'wifi_incident.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const SEED_PATH = path.join(__dirname, 'seed.sql');

function initDatabase() {
    console.log(`[DB INIT] Membuka / Membuat basis data SQLite di: ${DB_PATH}`);
    const db = new DatabaseSync(DB_PATH);

    console.log(`[DB INIT] Membaca skema DDL dari: ${SCHEMA_PATH}`);
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schemaSql);
    console.log(`[DB INIT] Skema tabel berhasil dieksekusi.`);

    console.log(`[DB INIT] Membaca seed data awal dari: ${SEED_PATH}`);
    const seedSql = fs.readFileSync(SEED_PATH, 'utf-8');
    db.exec(seedSql);
    console.log(`[DB INIT] Seed data awal berhasil dimasukkan.`);

    // Verifikasi jumlah baris pada tiap tabel
    const tables = ['pengguna', 'ruangan', 'access_point', 'tiket_insiden', 'log_telemetri_ap', 'tindakan_penanganan', 'surat_dispensasi'];
    console.log(`\n--- RINGKASAN DATA BASIS DATA ---`);
    for (const tbl of tables) {
        const query = db.prepare(`SELECT COUNT(*) as count FROM ${tbl}`);
        const result = query.get();
        console.log(`- Tabel '${tbl}': ${result.count} data`);
    }
    console.log(`---------------------------------\n`);
    console.log(`[DB INIT] Inisialisasi basis data SELESAI dan SIAP DIGUNAKAN!`);
    db.close();
}

if (require.main === module) {
    try {
        initDatabase();
    } catch (err) {
        console.error('[DB INIT ERROR]', err);
        process.exit(1);
    }
}

module.exports = { initDatabase, DB_PATH };

