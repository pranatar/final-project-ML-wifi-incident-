# Changelog

Semua riwayat perubahan penting pada proyek ini didokumentasikan di berkas ini.

Format ini mengacu pada [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) dan proyek ini mematuhi prinsip [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.1] - 2026-11-04

### Added
- **Mode Hotspot / Jaringan Lokal**: Server sekarang mendengarkan di semua network interface (`0.0.0.0`) sehingga dapat diakses dari perangkat lain (HP teman) yang terhubung ke jaringan hotspot yang sama.
- **Deteksi IP Otomatis**: Saat `npm start`, terminal otomatis menampilkan daftar IP lokal laptop beserta URL lengkap yang bisa langsung dibuka dari browser HP, tanpa perlu cari IP secara manual.

### Changed
- `server.js`: Mengubah `server.listen(PORT, callback)` menjadi `server.listen(PORT, '0.0.0.0', callback)` untuk dukungan akses lintas-perangkat.
- `server.js`: Menambahkan `require('node:os')` untuk deteksi network interface secara dinamis.

## [0.5.0] - 2026-11-04 10:00:00 (+08:00)

### Added
- **Skema & Inisialisasi Basis Data Nyata (SQLite & DDL SQL)**: Menambahkan [`database/schema.sql`](database/schema.sql), [`database/seed.sql`](database/seed.sql), dan [`database/init_db.js`](database/init_db.js) yang mengimplementasikan 7 tabel relasional lengkap (`pengguna`, `ruangan`, `access_point`, `tiket_insiden`, `log_telemetri_ap`, `tindakan_penanganan`, `surat_dispensasi`) beserta indeks performa query cepat `< 100ms`.
- **Backend Service & RESTful API Engine**: Membangun backend arsitektur modular tanpa ketergantungan pihak ketiga (*zero external dependencies*) memanfaatkan Node.js 22 built-in `node:sqlite` dan `node:http`:
  - `src/services/ticketService.js`: Penanganan tiket aduan, pencarian, dan **Algoritma Auto-Clustering Cerdas** (deteksi otomatis gangguan massal di ruangan yang sama $\ge 2$ laporan dalam 15 menit $\to$ auto-elevate ke `P1-CRITICAL` & eskalasi instan ke NOC).
  - `src/services/telemetryService.js`: Monitoring telemetri AP dan eksekusi mitigasi beban cepat (*Dynamic Client Steering*, *DHCP Flush*, *Load Balancing*).
  - `src/services/dispensationService.js`: Pembuatan Surat Keterangan Gangguan Resmi bernomor otomatis, generator token kriptografi QR, dan endpoint verifikasi publik untuk dosen.
  - `src/services/statsService.js`: Agregasi metrik KPI ITSM dan dashboard NOC.
  - `src/routes.js` & `server.js`: HTTP Server yang melayani 12 endpoint REST API dan hosting antarmuka statis di port 3000.
- **Automated End-to-End Test Suite**: Menambahkan [`tests/test_api.js`](tests/test_api.js) dengan 10 skenario pengujian otomatis (Health check, Auto-clustering P1, Remediasi beban AP, Verifikasi QR token, dan Persetujuan Dosen) yang terverifikasi **100% Lulus (10/10 Passed)**.
- **Full-Stack Wiring**: Mengintegrasikan prototipe [`mockup_antarmuka_sistem.html`](mockup_antarmuka_sistem.html) secara dinamis ke REST API dengan mekanisme fallback offline otomatis.
- **Dokumentasi REST API & Backend**: Menambahkan berkas dokumen [`DOKUMENTASI_API_DAN_BACKEND.md`](DOKUMENTASI_API_DAN_BACKEND.md) memuat spesifikasi lengkap seluruh endpoint, format request/response JSON, diagram arsitektur, dan panduan pengoperasian.

## [0.4.0] - 2026-11-03 13:28:00 (+08:00)

### Added
- **Prototipe Antarmuka Pengguna Interaktif**: Menambahkan berkas [`mockup_antarmuka_sistem.html`](mockup_antarmuka_sistem.html) berupa prototipe web interaktif responsif dengan 3 layar utama: Portal Darurat Mahasiswa (laporan cepat, diagnosa latensi, live support), Dashboard Monitoring NOC/Helpdesk (manajemen tiket & pemantauan status AP), serta Generator Template Surat Keterangan Gangguan Resmi PDF siap cetak dengan stempel & barcode validasi.
- **Dokumentasi Desain Antarmuka & Wireframe**: Menambahkan berkas dokumen [`DESAIN_ANTARMUKA_UI_MOCKUP.md`](DESAIN_ANTARMUKA_UI_MOCKUP.md) yang merinci filosofi UX, hierarki visual, struktur komponen wireframe, serta panduan skenario pengujian interaktif prototipe.

## [0.3.0] - 2026-11-03 13:23:00 (+08:00)

### Added
- **Dokumentasi Perancangan & Pemodelan Sistem (UML & ERD)**: Menambahkan berkas dokumen [`PEMODELAN_SISTEM_UML.md`](PEMODELAN_SISTEM_UML.md) yang memuat perancangan dan pemodelan sistem formal secara komprehensif, mencakup Use Case Diagram & Spesifikasi Use Case, Activity Diagram (BPMN Swimlane lintas aktor), Sequence Diagram interaksi pesan waktu-nyata, serta Entity Relationship Diagram (ERD) dan skema kamus data database.

## [0.2.0] - 2026-11-02 16:00:00 (+08:00)

### Added
- **Dokumentasi Spesifikasi Alur Kerja & Kebutuhan Sistem**: Menambahkan berkas dokumen [`WORKFLOW_DAN_KEBUTUHAN_SISTEM.md`](WORKFLOW_DAN_KEBUTUHAN_SISTEM.md) yang merinci spesifikasi alur kerja 5 fase penanganan insiden Wi-Fi serta daftar kebutuhan sistem lengkap: Kebutuhan Fungsional (FR-01 s/d FR-08) dan Kebutuhan Non-Fungsional (NFR-01 s/d NFR-08) beserta metrik keberhasilannya.

## [0.1.0] - 2026-11-02 15:45:14 (+08:00)

### Added
- **Aset Diagram Alur Kerja**: Menambahkan berkas [`workflow_gangguan_wifi.png`](workflow_gangguan_wifi.png) yang memvisualisasikan diagram alur langkah penyelesaian insiden Wi-Fi tidak stabil saat mahasiswa mengerjakan tugas daring. Tujuannya adalah menyediakan panduan sistematis penanganan gangguan jaringan internet.
