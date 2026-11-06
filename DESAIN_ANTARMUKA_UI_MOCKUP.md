# DOKUMEN PERANCANGAN ANTARMUKA PENGGUNA (UI/UX MOCKUP)
## Kasus: Penanganan Gangguan Wi-Fi Tidak Stabil / Terputus saat Mahasiswa Mengerjakan Tugas Daring

---

## 1. PENDAHULUAN & PRINSIP DESAIN
Dokumen ini menguraikan perancangan antarmuka pengguna (*User Interface & User Experience Design*) untuk Sistem Manajemen Insiden Wi-Fi Kampus. Perancangan difokuskan pada pemenuhan kebutuhan fungsional (FR-01, FR-02, FR-03, FR-07) dan kebutuhan non-fungsional (NFR-02, NFR-06: Form < 3 klik, respon instan saat koneksi drop).

### Prinsip UX yang Diterapkan:
1. **Visibility of System Status (Jakob Nielsen)**: Status penanganan tiket ditampilkan secara langsung (*live stepper progress tracker*) dari tahap Laporan Diterima $\to$ Triase L1 $\to$ Perbaikan NOC $\to$ Selesai.
2. **Minimalist & Fast-Loading Design**: Menggunakan palet warna terstandarisasi, komponen ringkas, dan struktur DOM yang ringan agar tetap dapat dimuat dengan lancar meskipun perangkat mahasiswa mengalami *packet loss* tinggi atau degradasi sinyal.
3. **Error Prevention & Clarity**: Form aduan menggunakan *dropdown pre-filled* (Gedung, Lantai, Ruangan) untuk menghindari salah ketik nama ruangan yang krusial bagi tim teknisi lapangan.

---

## 2. STRUKTUR DAN RINCIAN 3 LAYAR UTAMA

Sistem menyediakan 3 layar terpadu yang dapat diakses secara interaktif pada berkas:
📄 [`mockup_antarmuka_sistem.html`](mockup_antarmuka_sistem.html)

---

### A. LAYAR 1: PORTAL MAHASISWA (MOBILE EMERGENCY PORTAL)
Dirancang khusus untuk tampilan layar gawai (*smartphone*) atau peramban laptop dalam mode darurat.

#### 1. Komponen Antarmuka Form Pelaporan (Pre-Submit):
* **Live S.O.S Indicator**: Penanda status layanan aktif untuk memberikan rasa tenang (*reassurance*) kepada mahasiswa.
* **Banner Peringatan Bukti Tugas**: Menekankan tips penting agar mahasiswa mengambil *screenshot* error sebelum batas waktu tugas habis.
* **Input Identitas**: NIM dan Nama Mahasiswa (terintegrasi otomatis dengan sesi Single Sign-On jika login kampus aktif).
* **Dropdown Lokasi Cepat**:
  * Pilihan Gedung (contoh: Gedung B - Fakultas Teknik).
  * Pilihan Lantai (Lantai 2).
  * Pilihan Ruangan (Lab Komputer 3).
* **Pemilihan Gejala**: Opsi radio/dropdown cepat seperti *"Koneksi Terputus saat Submit Tugas di LMS"*.
* **Kotak Unggah Bukti**: Area *drag-and-drop* atau tangkapan gambar instan bukti error transmisi.
* **Tombol Aksi**: *“Kirim Laporan Darurat Sekarang”* (Kontras tinggi, warna biru/merah tombol primer).

#### 2. Komponen Antarmuka Pelacak Tiket (Post-Submit Tracker):
* **ID Tiket Unik**: Format otomatis `#TKT-WIFI-202611-0042`.
* **Visual Stepper (4 Tahap Penanganan)**:
  1. *Laporan Diterima*: Notifikasi waktu penerimaan dan korelasi laporan serupa di ruangan yang sama.
  2. *Triase Helpdesk (L1)*: Indikator eskalasi prioritas (P1 CRITICAL).
  3. *Penanganan Teknisi NOC*: Keterangan tindakan yang sedang berjalan (contoh: *Load balancing AP & pembersihan lease DHCP*).
  4. *Verifikasi & Pemulihan*: Tombol konfirmasi sinyal telah normal.
* **Aksi Unduh Cepat**: Tombol langsung untuk mengunduh *Surat Keterangan Gangguan Digital* untuk Dosen Pengampu jika waktu tugas terlanjur habis.

---

### B. LAYAR 2: DASHBOARD MONITORING & TRIASE (NOC & HELPDESK)
Dirancang untuk layar monitor operator Helpdesk (Tier 1) dan Network Engineer (Tier 2/3) di ruang Network Operations Center.

#### 1. Kartu Ringkasan Metrik (KPI Metric Cards):
* **Status Access Point**: Rasio AP online vs offline/degraded (64/65 AP Aktif).
* **Klien Terhubung**: Jumlah total perangkat nirkabel yang sedang menggunakan internet kampus beserta distribusi spektrum (68% pita 5 GHz, 32% pita 2.4 GHz).
* **Kapasitas DHCP Pool**: Persentase pemakaian IP subnet mahasiswa dengan batas ambang peringatan (*warning threshold* > 85%).
* **Tiket Prioritas P1 (Tugas Daring)**: Jumlah keluhan mendesak yang membutuhkan intervensi secepatnya (< 15 menit).

#### 2. Banner Deteksi Insiden Massal (Auto-Clustering Alert):
* Muncul otomatis jika algoritma sistem mendeteksi $\ge 2$ laporan aduan dari ruangan/AP yang sama dalam rentang 10 menit.
* Menyediakan tombol aksi cepat: *“Eksekusi Auto-Remediasi AP”*.

#### 3. Peta Lantai / Heatmap Ruangan (Interactive Floor Grid):
* **Ruang Kelas Normal**: Menampilkan indikator hijau, jumlah klien normal (18–22 klien), dan kanal frekuensi bersih.
* **Ruang Kelas Kritis / Overload**: Kotak bertanda merah (*Critical Alert*), utilisasi kapasitas AP 95%, rasio packet loss, dan latensi tinggi.
* **Fitur Interaktif Simulasi**: Pengguna dapat mengklik tombol remediasi untuk melihat simulasi pemulihan beban AP secara visual (beban berkurang dari 65 klien menjadi 28 klien, latensi pulih ke normal 11 ms).

#### 4. Panel Perintah Cepat Teknisi (Quick Action Tools):
* Tombol **Band Steering**: Memaksa perangkat dual-band beralih ke frekuensi 5 GHz.
* Tombol **Flush Lease IP**: Membersihkan IP lease yang sudah kedaluwarsa pada DHCP pool.
* Tombol **Prioritas LMS (QoS)**: Menerapkan aturan pembatasan *bandwidth* untuk menekan lalu lintas hiburan dan mengutamakan port LMS.
* Tombol **RF Auto Tuning**: Mengubah kanal frekuensi radio secara otomatis untuk mengeliminasi *co-channel interference*.

---

### C. LAYAR 3: SURAT KETERANGAN GANGGUAN RESMI (DIGITAL INCIDENT CERTIFICATE)
Dirancang dengan format tata letak standar dokumen resmi kedinasan/perguruan tinggi yang siap dicetak (*Print-ready A4*) atau disimpan dalam bentuk PDF.

#### Komponen Dokumen:
1. **Kop Surat Kedinasan**: Memuat logo resmi, Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi, nama universitas, dan kontak UPT TIK.
2. **Nomor Surat & Klasifikasi**: Format penomoran surat resmi kearsipan kampus (contoh: `421.3/UPT-TIK/SK-GANGGUAN/XI/2026`).
3. **Pernyataan Keabsahan Insiden**: Menyatakan bahwa kegagalan transmisi data bukan akibat kelalaian mahasiswa, melainkan kendala infrastruktur Access Point di lokasi terverifikasi.
4. **Tabel Rincian Kejadian**:
   * Nama & NIM Mahasiswa.
   * Lokasi Ruang & Gedung.
   * Nomor Tiket Acuan yang telah berstatus *Resolved*.
   * Rentang Waktu Terjadinya Gangguan (Waktu mulai s/d pulih).
   * Akar Masalah Teknis (*Root Cause Analysis*).
5. **Rekomendasi Akademik**: Rekomendasi tegas kepada Dosen Pengampu untuk memberikan perpanjangan waktu pengumpulan atau membuka kembali sesi ujian selama minimal 30 menit.
6. **QR Code Verifikasi & Tanda Tangan Digital**: QR Code yang dapat dipindai oleh dosen menggunakan kamera gawai untuk memvalidasi keaslian surat di server UPT TIK secara instan.

---

## 3. CARA MENGUJI COBA PROTOTIPE INTERAKTIF
1. Buka berkas [`mockup_antarmuka_sistem.html`](mockup_antarmuka_sistem.html) pada peramban web (Google Chrome / Microsoft Edge / Mozilla Firefox).
2. Gunakan menu tab navigasi di bagian atas:
   * Klik **"1. Portal Mahasiswa (Mobile)"** $\to$ Klik tombol *“Kirim Laporan Darurat Sekarang”* untuk melihat transisi stepper status tiket interaktif.
   * Klik **"2. Dashboard NOC & Helpdesk"** $\to$ Klik tombol *“Eksekusi Auto-Remediasi AP”* untuk melihat simulasi perbaikan beban AP dan toast notifikasi teknis.
   * Klik **"3. Surat Bukti Resmi (PDF)"** $\to$ Klik tombol *“Cetak / Simpan PDF”* untuk melihat pratinjau cetak surat kedinasan yang rapi dan siap unduh.
