/**
 * Modul Database Wrapper
 * Menyediakan koneksi singleton ke SQLite database
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DB_PATH = path.join(__dirname, '..', 'database', 'wifi_incident.db');

let dbInstance = null;

function getDb() {
    if (!dbInstance) {
        if (!fs.existsSync(DB_PATH)) {
            // Auto inisialisasi jika file database belum ada
            const { initDatabase } = require('../database/init_db');
            initDatabase();
        }
        dbInstance = new DatabaseSync(DB_PATH);
        // Aktifkan foreign key constraint & WAL mode
        dbInstance.exec('PRAGMA foreign_keys = ON;');
    }
    return dbInstance;
}

module.exports = { getDb, DB_PATH };

