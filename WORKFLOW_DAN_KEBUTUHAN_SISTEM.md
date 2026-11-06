# SPESIFIKASI WORKFLOW DAN ANALISIS KEBUTUHAN SISTEM
## Kasus: Penanganan Gangguan Wi-Fi Tidak Stabil / Terputus saat Mahasiswa Mengerjakan Tugas Daring

---

## 1. PENDAHULUAN & LATAR BELAKANG
Dalam ekosistem perkuliahan modern, kestabilan jaringan nirkabel (*Wi-Fi*) merupakan infrastruktur misi-kritis (*mission-critical*). Terputusnya koneksi saat mahasiswa melakukan ujian atau pengumpulan tugas daring berpotensi menimbulkan kerugian akademik (kehilangan data jawaban, keterlambatan submit, atau status *auto-fail*). 

Dokumen ini memuat:
1. **Detail Lengkap Tiap Fase Workflow Penanganan Insiden** (Standar ITSM/ITIL v4).
2. **Kebutuhan Fungsional (Functional Requirements - FR)** untuk sistem manajemen jaringan dan helpdesk.
3. **Kebutuhan Non-Fungsional (Non-Functional Requirements - NFR)** sebagai tolok ukur kualitas, performa, dan keamanan sistem.

---

## 2. DETAIL WORKFLOW SETIAP FASE PENANGANAN

```
[FASE 1: Mahasiswa] 
       │ (Deteksi, Bukti, & Self-Check)
       ▼
[FASE 2: IT Helpdesk L1] 
       │ (Registrasi, Korelasi Tiket, & Triase Cakupan)
       ├─── Jalur A: Masalah Perangkat Klien ──> [Resolusi Mandiri Klien]
       └─── Jalur B: Gangguan Massal / AP ──> (Eskalasi Prioritas Urgent)
                                                     │
                                                     ▼
                                      [FASE 3: Network Admin / NOC L2-L3]
                                                     │ (Analisis Controller, DHCP, RF, QoS)
                                                     ▼
                                      [FASE 4: Verifikasi & Koordinasi Akademik]
                                                     │ (Uji Stabilitas, Konfirmasi, & Surat Bukti)
                                                     ▼
                                      [FASE 5: Evaluasi & Continuous Improvement]
                                                       (RCA & Rencana Kapasitas Jangka Panjang)
```

---

### FASE 1: Deteksi Gangguan & Penanganan Mandiri (End-User / Mahasiswa)
Fase awal di mana pengguna mendeteksi anomali transmisi data dan melakukan tindakan pertolongan pertama sebelum mengajukan eskalasi.

* **Aktor Utama**: Mahasiswa
* **Trigger (Pemicu)**: Halaman Learning Management System (LMS) menampilkan status *“Request Timed Out”*, tombol *submit* gagal merespons, atau indikator Wi-Fi laptop berubah menjadi *“No Internet Access”*.
* **Aktivitas Rinci**:
  1. **Dokumentasi Bukti Insiden**: Mahasiswa mengambil tangkapan layar (*screenshot*) halaman tugas yang memuat jam sistem laptop dan pesan kegagalan transmisi. Ini menjadi bukti sah jika terjadi sengketa batas waktu (*deadline*).
  2. **Pemeriksaan Captive Portal / SSO**: Mahasiswa membuka tab baru dan mengakses URL gateway untuk memverifikasi apakah masa berlaku sesi login (*session lifetime*) telah habis. Jika habis, lakukan re-login.
  3. **Toggle Network Adapter**: Mematikan Wi-Fi perangkat selama 5 detik lalu mengaktifkannya kembali untuk memaksa negosiasi ulang DHCP dan *association* ke Access Point (AP).
  4. **Peralihan Frekuensi Radio (Dual-Band Switching)**: Jika kampus menyediakan SSID 5 GHz terpisah, beralih dari frekuensi 2.4 GHz ke 5 GHz guna menghindari interferensi gelombang mikro dan kepadatan kanal.
  5. **Pengajuan Tiket Darurat**: Jika dalam 1–2 menit koneksi tetap tidak pulih, mahasiswa mengakses formulir pelaporan cepat / kontak darurat Helpdesk TI.
* **Input**: Pesan error pada browser / adapter jaringan.
* **Output**: Log bukti kendala (screenshot) dan draft laporan aduan.
* **Service Level Target (SLA Mandiri)**: Maksimal 2 menit.

---

### FASE 2: Registrasi, Triase & Penanganan L1 (IT Helpdesk Support Tier 1)
Fase penerimaan laporan, kategorisasi insiden, dan penentuan apakah akar masalah berada pada perangkat pengguna (*client-side*) atau infrastruktur jaringan kampus (*network-side*).

* **Aktor Utama**: Petugas IT Helpdesk (Tier 1 Support)
* **Aktivitas Rinci**:
  1. **Pencatatan Tiket (Incident Logging)**: Sistem Helpdesk mencatat metadata pelapor:
     * Identitas: Nama, NIM, Program Studi.
     * Lokasi Fisik: Gedung, Nomor Lantai, Nomor Ruangan/Lab.
     * Lingkungan Teknis: Sistem Operasi (Windows/macOS/Linux/Android), MAC Address perangkat, nama SSID yang terhubung.
     * Tingkat Urgensi: Ditandai "Akademik - Sedang Mengerjakan Tugas/Kuis Daring".
  2. **Korelasi Data & Triase Cepat (Pattern Recognition)**:
     * Helpdesk memeriksa dasbor pemantauan: *Apakah ada laporan serupa dari ruangan atau gedung yang sama dalam rentang 15 menit terakhir?*
  3. **Penanganan Jalur A - Masalah Lokal Perangkat (Single-User Issue)**:
     * Jika hanya 1 mahasiswa yang terdampak di ruangan tersebut:
       * Memberikan instruksi panduan via chat/telepon: Lakukan *Forget Wi-Fi Network*, periksa pengaturan TCP/IPv4 agar disetel ke mode otomatis (*Obtain IP automatically*).
       * Memandu eksekusi perintah terminal pembersihan cache jaringan:
         ```shell
         ipconfig /flushdns
         netsh winsock reset
         ```
       * Jika selesai, tiket ditutup dengan kategori *“Client Configuration Resolved”*.
  4. **Penanganan Jalur B - Gangguan Massal / Infrastruktur (Multi-User Issue)**:
     * Jika terdapat ≥ 2 laporan di area yang sama, atau seluruh user di ruangan tersebut mengeluh hal serupa:
       * Status insiden dinaikkan menjadi **P1 (High Priority / Academic Impact)**.
       * Helpdesk langsung meneruskan tiket ke Network Operation Center (NOC) Tier 2 tanpa penundaan.
* **Input**: Formulir tiket aduan dari mahasiswa.
* **Output**: Nomor Tiket Resmi, Klasifikasi Masalah (Klien vs Jaringan), Notifikasi Eskalasi ke NOC.
* **Service Level Agreement (SLA Helpdesk)**: Respons pertama < 3 menit; Triase selesai < 5 menit.

---

### FASE 3: Diagnosa & Remediasi Infrastruktur (Network Administrator / NOC Tier 2 & Tier 3)
Fase teknis mendalam untuk menstabilkan perangkat transmisi radio, alokasi pengalamatan IP, dan jalur distribusi *bandwidth*.

* **Aktor Utama**: Network Engineer / Administrator Jaringan (NOC)
* **Aktivitas Rinci (Diagnosa 4 Titik Kegagalan)**:
  1. **Analisis Beban Access Point (AP Client Overload)**:
     * *Diagnosa*: Melalui Wireless LAN Controller (WLC), admin mengecek AP di ruangan terkait. Jika beban terhubung melampaui ambang batas aman (> 45-60 klien aktif pada 1 unit AP).
     * *Tindakan Remediasi*: 
       * Mengaktifkan algoritma *Load Balancing* dinamis untuk mendistribusikan sebagian perangkat ke AP di koridor/ruangan sebelah.
       * Mengaktifkan fitur *Band Steering* agresif agar perangkat yang mendukung 5 GHz otomatis dipaksa berpindah dari spektrum 2.4 GHz.
  2. **Inspeksi Ketersediaan IP (DHCP Pool Exhaustion)**:
     * *Diagnosa*: Log server DHCP menampilkan status *Pool Exhausted* (alamat IP pada VLAN mahasiswa habis, menyebabkan perangkat gagal memperoleh IP dan berstatus *APIPA 169.254.x.x*).
     * *Tindakan Remediasi*:
       * Mengurangi *Lease Time* DHCP dari default (misal 24 jam) menjadi **1–2 jam** di area perkuliahan padat.
       * Mengeksekusi pembersihan IP *stale/inactive* secara paksa.
       * Menambahkan pool subnet sekunder pada VLAN mahasiswa di router gateway.
  3. **Optimasi Spektrum Radio & Interferensi (RF & Channel Interference)**:
     * *Diagnosa*: Terdeteksi *Co-Channel Interference* tinggi (AP di lantai yang sama saling bertabrakan menggunakan channel yang sama pada pita 2.4 GHz).
     * *Tindakan Remediasi*:
       * Memindahkan channel radio ke kanal bersih non-overlapping (Channel 1, 6, atau 11).
       * Menurunkan *Transmit Power (Tx Power)* AP tetangga agar sel jangkauan tidak saling tumpang tindih secara destruktif.
  4. **Manajemen Lalu Lintas & Bandwidth Shaping (QoS Enforcement)**:
     * *Diagnosa*: Terdeteksi pemakaian *bandwidth* abnormal (misal ada user melakukan download file besar/torrent/streaming 4K yang menghabiskan pipa transmisi AP).
     * *Tindakan Remediasi*:
       * Menerapkan pembatasan *bandwidth per-user* (misal: downstream maks 5 Mbps, upstream 2 Mbps).
       * Mengatur prioritas QoS *DSCP/CoS* tertinggi untuk lalu lintas port web e-learning kampus (HTTP/HTTPS) dan menempatkan paket P2P/video streaming di prioritas terendah (*best effort / scavenged*).
  5. **Pengujian Stabilitas (Post-Remediation Verification)**:
     * Melakukan *continuous ping* dari controller ke sampel perangkat di ruangan (Target: Latency < 20 ms, Packet Loss 0%).
* **Input**: Data telemetri WLC, Syslog server, status lease DHCP.
* **Output**: Status jaringan stabil, log perbaikan konfigurasi, pembaruan status tiket ke *“Resolved by NOC”*.
* **Service Level Agreement (SLA Perbaikan Jaringan)**: Resolusi teknis selesai dalam kurun waktu 10–15 menit.

---

### FASE 4: Verifikasi Akhir & Koordinasi Mitigasi Akademik
Fase penutupan siklus penanganan teknis sekaligus perlindungan terhadap hak akademik mahasiswa yang terdampak gangguan.

* **Aktor Utama**: Helpdesk TI, Mahasiswa Pelapor, dan Bagian Akademik / Dosen Pengampu
* **Aktivitas Rinci**:
  1. **Konfirmasi Mahasiswa**: Helpdesk menghubungi mahasiswa pelapor untuk memastikan sinyal telah stabil dan mahasiswa berhasil mengunggah file tugas atau melanjutkan sesi ujian.
  2. **Penerbitan Surat Bukti Gangguan (Incident Verification Letter)**:
     * Apabila waktu pengumpulan tugas di portal akademik telah habis saat proses perbaikan jaringan berlangsung:
     * Helpdesk TI secara resmi menerbitkan **Bukti Gangguan Sistem TI** (*Digital Incident Verification Ticket*) yang memuat:
       * ID Tiket & Stempel Waktu (Waktu mulai gangguan s/d waktu pulih).
       * Keterangan resmi dari Tim TI bahwa telah terjadi kendala teknis jaringan di lokasi ruang terkait.
     * Dokumen tersebut ditembuskan ke Dosen Pengampu dan Bagian Akademik sebagai dasar legal perpanjangan batas waktu submit atau pembukaan kembali slot tugas (*re-opening assignment window*).
  3. **Penutupan Tiket**: Tiket secara resmi diubah statusnya menjadi **CLOSED (RESOLVED)**.
* **Input**: Konfirmasi keberhasilan submit dari mahasiswa.
* **Output**: Status tiket Closed, Surat Bukti Gangguan Jaringan (jika diperlukan).

---

### FASE 5: Evaluasi Pasca-Insiden (Post-Incident Review & Continuous Improvement)
Fase refleksi dan perbaikan jangka panjang agar insiden serupa tidak terulang kembali di masa depan.

* **Aktor Utama**: Kepala Divisi TI / Infrastruktur Jaringan
* **Aktivitas Rinci**:
  1. **Root Cause Analysis (RCA)**: Mendokumentasikan akar penyebab utama ke dalam *Knowledge Base* internal TI.
  2. **Audit Kapasitas Berkala (Capacity Planning)**:
     * Jika suatu ruangan secara konsisten mengalami lonjakan beban AP di jam kuliah tertentu, tim infrastruktur merencanakan penambahan unit AP baru dengan teknologi kerapatan tinggi (*High-Density Wi-Fi 6 AP*).
     * Melakukan survei lokasi ulang (*Wi-Fi Site Survey & Heatmap Refresh*) setiap semester.

---

## 3. ANALISIS KEBUTUHAN SISTEM

Untuk mendukung berjalannya alur kerja di atas secara efektif dan terotomatisasi, sistem jaringan dan helpdesk kampus wajib memenuhi spesifikasi kebutuhan fungsional dan non-fungsional berikut:

### A. Kebutuhan Fungsional (Functional Requirements - FR)

Kebutuhan fungsional mendefinisikan fitur-fitur, fungsi proses, dan kapabilitas spesifik yang harus disediakan oleh sistem:

| ID Kebutuhan | Nama Fitur / Modul | Deskripsi Kebutuhan Fungsional |
| :--- | :--- | :--- |
| **FR-01** | **Quick Incident Reporting Portal** | Sistem helpdesk harus menyediakan antarmuka pelaporan cepat (akses via web & WhatsApp bot) di mana mahasiswa dapat melapor dengan input minimal: NIM, pemilihan lokasi dropdown (Gedung, Lantai, Ruang), jenis kendala, dan tombol upload screenshot. |
| **FR-02** | **Automated Ticket Triaging & Correlation** | Sistem tiket harus mampu mendeteksi secara otomatis (*auto-clustering*) jika terdapat ≥ 2 laporan aduan yang berasal dari Access Point atau ruangan yang sama dalam jendela waktu 10 menit, dan langsung menaikkan status insiden menjadi P1 (Urgent/Massal). |
| **FR-03** | **Wi-Fi Controller Telemetry & Real-Time Heatmap** | Sistem controller nirkabel (WLC) harus menyediakan dasbor visualisasi *real-time* yang menampilkan status utilisasi CPU AP, jumlah klien yang terhubung per AP, persentase packet loss, dan level interferensi sinyal radio di tiap lantai gedung. |
| **FR-04** | **Dynamic Band Steering & Load Balancing** | Sistem Access Point harus memiliki kapabilitas otomatis untuk mengarahkan (*steer*) perangkat berkemampuan dual-band ke pita frekuensi 5 GHz / 6 GHz, serta menolak asosiasi klien baru jika batas kapasitas AP telah tercapai (*client limit*) dan mengarahkannya ke AP tetangga terdekat. |
| **FR-05** | **Smart DHCP Pool Alert & Auto-Flush** | Server DHCP harus memiliki fitur peringatan otomatis (*automated alert*) ke tim NOC saat kapasitas IP pool tersisa kurang dari 15%, serta modul pembersihan otomatis (*auto-release*) untuk IP lease perangkat yang tidak aktif selama lebih dari 60 menit. |
| **FR-06** | **Quality of Service (QoS) & Bandwidth Limiting** | Sistem gateway/firewall harus mampu mengklasifikasikan paket data dan membatasi pemakaian *bandwidth per-user* (misal max 5 Mbps), serta memberikan prioritas antrean (*traffic prioritization*) untuk port aplikasi e-learning/LMS kampus dibanding lalu lintas hiburan. |
| **FR-07** | **Digital Incident Certificate Generator** | Sistem helpdesk harus memiliki fitur pembuatan dokumen digital resmi (PDF) secara otomatis yang mencantumkan validasi gangguan jaringan lengkap dengan tanda tangan digital/QR code untuk diserahkan mahasiswa kepada dosen pengampu. |
| **FR-08** | **Session Lifetime Warning Notification** | Sistem Captive Portal / SSO kampus harus memunculkan notifikasi pop-up peringatan kepada mahasiswa 5 menit sebelum masa sesi login Wi-Fi berakhir, agar mahasiswa tidak terputus secara mendadak saat sedang mengisi jawaban tugas. |

---

### B. Kebutuhan Non-Fungsional (Non-Functional Requirements - NFR)

Kebutuhan non-fungsional mendefinisikan batasan arsitektural, performa, ketersediaan, dan standar keamanan yang harus dipenuhi oleh infrastruktur:

| Parameter Kualitas | ID Kebutuhan | Deskripsi Kebutuhan Non-Fungsional |
| :--- | :--- | :--- |
| **Ketersediaan (Availability)** | **NFR-01** | Infrastruktur jaringan Wi-Fi di seluruh area ruang perkuliahan dan lab harus memiliki tingkat ketersediaan (*uptime*) minimal **99.5%** selama jam operasional akademik (07.00 – 18.00 WIB). |
| **Kecepatan & Performa (Performance)** | **NFR-02** | *Mean Time to Respond (MTTR)* untuk insiden darurat akademik (P1) harus di bawah **3 menit** untuk respons pertama helpdesk, dan pemulihan stabilitas jaringan di bawah **15 menit**. |
| **Latensi Jaringan** | **NFR-03** | Latensi jaringan rata-rata dari perangkat mahasiswa ke server LMS lokal kampus tidak boleh melebihi **25 ms** dengan tingkat *packet loss* maksimal **0.5%**. |
| **Kapasitas (Scalability / Concurrency)** | **NFR-04** | Setiap ruang kelas besar (kapasitas 80-100 mahasiswa) harus mampu melayani kepadatan perangkat nirkabel minimal **1.5 perangkat per mahasiswa** (laptop + smartphone) secara simultan tanpa mengalami kegagalan transmisi. |
| **Keamanan (Security)** | **NFR-05** | Jaringan nirkabel harus menerapkan standar enkripsi **WPA2/WPA3-Enterprise (802.1X)** terintegrasi Single Sign-On (SSO) direktori kampus, serta mengaktifkan fitur **Client Isolation** pada SSID mahasiswa guna mencegah serangan sniffing, ARP poisoning, dan penyebaran malware antar-perangkat di satu ruangan. |
| **Kemudahan Penggunaan (Usability)** | **NFR-06** | Antarmuka formulir pelaporan gangguan harus dirancang responsif (*mobile-friendly*), dapat dimuat dalam waktu kurang dari 2 detik meskipun kondisi sinyal lemah, dan dapat diselesaikan oleh mahasiswa dalam **maksimal 3 langkah/klik**. |
| **Keandalan & Redundansi (Reliability)** | **NFR-07** | Switch distribusi jaringan Wi-Fi di tiap gedung wajib dilengkapi dengan jalur *uplink failover* (minimal dual link LACP / STP) agar jika salah satu kabel/port putus, transmisi data secara otomatis dialihkan ke link cadangan dalam waktu < 2 detik. |
| **Audit & Kepatuhan (Auditability / Logging)** | **NFR-08** | Seluruh rekaman aktivitas jaringan (WLC log, DHCP transactions, auth log RADIUS, dan helpdesk ticket history) wajib disimpan dalam server Syslog terpusat dengan retensi data minimal **6 bulan** untuk keperluan audit insiden dan pelacakan forensik. |

---

## 4. MATRIKS HUBUNGAN WORKFLOW DENGAN KEBUTUHAN SISTEM

| Fase Alur Kerja | Fitur Fungsional Pendukung | Target Kualitas Non-Fungsional |
| :--- | :--- | :--- |
| **Fase 1: Deteksi & Mandiri** | FR-08 (Peringatan Sesi SSO), FR-01 (Form Cepat) | NFR-06 (Form ringan & cepat diakses saat sinyal drop) |
| **Fase 2: Triase L1** | FR-01 (Logging Cepat), FR-02 (Auto-Cluster Kasus Massal) | NFR-02 (Respon Helpdesk < 3 menit) |
| **Fase 3: Perbaikan L2/L3** | FR-03 (Telemetry WLC), FR-04 (Band Steering), FR-05 (DHCP), FR-06 (QoS) | NFR-03 (Latency < 25ms), NFR-04 (Support > 100 user/ruang) |
| **Fase 4: Verifikasi & Selesai** | FR-07 (Surat Bukti Digital Kendala Akademik) | NFR-05 (Validitas & Keamanan Tanda Tangan Digital) |
| **Fase 5: Continuous Improvement**| FR-03 (Audit Heatmap Historis) | NFR-08 (Retensi Log Audit 6 Bulan) |

---
*Dokumen ini disusun sebagai panduan standar operasional penanganan insiden jaringan nirkabel kampus berbasis Service Level Agreement (SLA) & ITIL Framework.*
