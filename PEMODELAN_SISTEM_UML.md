# DOKUMEN PEMODELAN SISTEM (UML & BPMN)
## Kasus: Penanganan Gangguan Wi-Fi Tidak Stabil / Terputus saat Mahasiswa Mengerjakan Tugas Daring

---

## 1. PENDAHULUAN
Dokumen ini menyajikan perancangan dan pemodelan sistem terstruktur untuk merealisasikan alur kerja (*workflow*) dan kebutuhan fungsional (FR-01 s/d FR-08) yang telah disusun pada dokumen spesifikasi sebelumnya.

Pemodelan ini mencakup:
1. **Identifikasi & Matriks Aktor Sistem**
2. **Use Case Diagram & Spesifikasi Use Case Inti**
3. **Activity Diagram (BPMN Swimlane) Lintas Aktor**
4. **Sequence Diagram (Interaksi Pesan Real-Time saat Gangguan Terjadi)**
5. **Entity Relationship Diagram (ERD) & Struktur Database**

---

## 2. IDENTIFIKASI & MATRIKS AKTOR SISTEM

Sistem penanganan insiden ini melibatkan **4 aktor manusia** dan **1 aktor sistem otomatis**:

| Aktor | Tipe Aktor | Deskripsi & Tanggung Jawab Utama |
| :--- | :--- | :--- |
| **Mahasiswa** | *Primary Actor (User)* | Mengalami gangguan koneksi, melakukan pemeriksaan mandiri, mengirim tiket aduan darurat, mengunggah screenshot bukti kendala, dan memverifikasi koneksi. |
| **IT Helpdesk (Tier 1)** | *Internal Actor* | Menerima tiket masuk, memverifikasi data pelapor, melakukan triase klasifikasi gangguan (klien vs jaringan), memberikan panduan setting perangkat, dan mengeksekusi eskalasi. |
| **Network Admin / NOC (Tier 2/3)** | *Technical Actor* | Menerima tiket eskalasi prioritas tinggi, menganalisis controller Wi-Fi (WLC), mengoptimasi daya radio AP, mengelola DHCP pool, mengatur QoS, dan melakukan uji latensi gateway. |
| **Dosen / Bagian Akademik** | *Secondary Actor* | Menerima tembusan surat bukti kendala resmi (digital incident certificate) dan memberikan dispensasi perpanjangan batas waktu submit tugas di LMS. |
| **Sistem Otomatis (WLC / Daemon Bot)** | *Automated System Actor* | Memantau telemetri beban AP, mendeteksi korelasi aduan massal (*auto-clustering*), mengirim alert IP DHCP kritis, dan memicu notifikasi peringatan masa sesi login SSO. |

---

## 3. USE CASE DIAGRAM

### A. Diagram Use Case (Mermaid)

```mermaid
flowchart LR
    %% Aktor
    M["👤 Mahasiswa"]
    H["🎧 IT Helpdesk (Tier 1)"]
    N["🛠️ Network Admin (Tier 2/3)"]
    D["🎓 Dosen / Akademik"]
    S["🤖 Sistem WLC / Bot"]

    %% Boundary Sub-Sistem
    subgraph System["SISTEM MANAJEMEN INSIDEN WI-FI KAMPUS"]
        UC1(["UC-01: Lapor Tiket Aduan Cepat"])
        UC2(["UC-02: Unggah Bukti Screenshot Tugas"])
        UC3(["UC-03: Panduan Self-Troubleshooting"])
        UC4(["UC-04: Triase & Klasifikasi Tiket"])
        UC5(["UC-05: Auto-Clustering Aduan Massal"])
        UC6(["UC-06: Monitoring Telemetri & Heatmap AP"])
        UC7(["UC-07: Remediasi Konfigurasi Jaringan & AP"])
        UC8(["UC-08: Terbitkan Surat Bukti Gangguan (PDF)"])
        UC9(["UC-09: Verifikasi Pemulihan Koneksi"])
        UC10(["UC-10: Penutupan Tiket & Dokumentasi RCA"])
    end

    %% Relasi Mahasiswa
    M --> UC1
    M --> UC2
    M --> UC3
    M --> UC9

    %% Relasi Helpdesk
    H --> UC4
    H --> UC8
    H --> UC9
    H --> UC10

    %% Relasi Network Admin
    N --> UC6
    N --> UC7
    N --> UC10

    %% Relasi Dosen
    D --> UC8

    %% Relasi Sistem Otomatis
    S --> UC5
    S --> UC6

    %% Include / Extend Relationships
    UC1 -.->|<<include>>| UC2
    UC4 -.->|<<extend>>| UC5
    UC7 -.->|<<include>>| UC6
    UC9 -.->|<<extend>>| UC8
```

---

### B. Spesifikasi Use Case Terperinci (Use Case Specification)

#### **1. Skenario UC-01: Lapor Tiket Aduan Cepat (Emergency Reporting)**
* **Aktor Utama**: Mahasiswa
* **Pemicu**: Akses Wi-Fi terputus di tengah pengerjaan tugas atau kuis daring.
* **Kondisi Awal (Pre-condition)**: Mahasiswa membuka portal pelaporan helpdesk (atau bot WhatsApp darurat).
* **Alur Utama (Main Flow)**:
  1. Mahasiswa memilih opsi *"Laporkan Gangguan Saat Ujian/Tugas Daring"*.
  2. Sistem menampilkan formulir ringkas: input NIM, pilihan dropdown lokasi (Gedung, Lantai, Nomor Ruang), dan deskripsi gejala.
  3. Mahasiswa melampirkan tangkapan layar (*screenshot*) error tugas.
  4. Mahasiswa menekan tombol *"Kirim Laporan Darurat"*.
  5. Sistem men-generate ID Tiket unik (contoh: `#TKT-WIFI-202611-042`) dan mengirim konfirmasi ke nomor kontak mahasiswa.
* **Kondisi Akhir (Post-condition)**: Tiket tersimpan di database dengan status `OPEN - PENDING TRIASE`.

---

#### **2. Skenario UC-04: Triase & Klasifikasi Tiket (Incident Triaging)**
* **Aktor Utama**: IT Helpdesk (Tier 1) didukung Sistem Otomatis (UC-05)
* **Kondisi Awal**: Tiket baru masuk ke dashboard Helpdesk.
* **Alur Utama (Main Flow)**:
  1. Helpdesk membuka detail tiket dan memverifikasi lokasi ruang mahasiswa.
  2. Sistem secara otomatis mencocokkan laporan lain:
     * *Jalur Kasus Klien*: Jika tidak ada laporan lain dari ruangan tersebut, helpdesk mengirim panduan perbaikan perangkat (re-autentikasi WPA2/Enterprise, flush DNS, reset adapter).
     * *Jalur Kasus Jaringan (Massal)*: Jika sistem mendeteksi ≥ 2 laporan dalam ruangan yang sama, tiket otomatis dinaikkan ke prioritas **P1 - CRITICAL**.
  3. Helpdesk mengeksekusi tombol *"Eskalasi ke Network NOC"* dengan melampirkan identitas Access Point terdekat.
* **Kondisi Akhir**: Tiket diperbarui menjadi status `ESCALATED_TO_NOC`.

---

#### **3. Skenario UC-07: Remediasi Konfigurasi Jaringan & AP**
* **Aktor Utama**: Network Admin / NOC Tier 2
* **Kondisi Awal**: Network Admin menerima notifikasi eskalasi tiket P1.
* **Alur Utama (Main Flow)**:
  1. Admin membuka dashboard WLC pada AP di ruang terdampak.
  2. Mengidentifikasi metrik bottleneck:
     * Kasus AP Overload $\to$ Eksekusi *dynamic client steering* ke AP koridor.
     * Kasus DHCP Exhaustion $\to$ Eksekusi pelepasan IP *inactive lease* & perluas pool.
     * Kasus Interferensi Radio $\to$ Tuning channel non-overlapping (1, 6, 11) dan daya transmisi (*Tx Power*).
     * Kasus Bandwidth Abuse $\to$ Terapkan limit QoS per-user maks. 5 Mbps.
  3. Admin menjalankan uji *ping loop* dan *latency test* ke gateway (< 15 ms).
  4. Admin menandai status tiket menjadi `RESOLVED_BY_NOC`.
* **Kondisi Akhir**: AP beroperasi normal, notifikasi penyelesaian terkirim ke Helpdesk.

---

#### **4. Skenario UC-08: Terbitkan Surat Bukti Gangguan (Digital Incident Certificate)**
* **Aktor Utama**: IT Helpdesk, Mahasiswa, dan Dosen Pengampu
* **Kondisi Awal**: Deadline submit tugas daring terlewat akibat durasi perbaikan jaringan.
* **Alur Utama (Main Flow)**:
  1. Mahasiswa mengajukan permintaan surat bukti pada tiket yang bersangkutan.
  2. Helpdesk memverifikasi log bahwa insiden terkonfirmasi terjadi pada jam pengerjaan tugas.
  3. Helpdesk menekan tombol *"Generate Surat Keterangan Gangguan TI"*.
  4. Sistem menghasilkan dokumen PDF resmi berisi: ID Tiket, Nama & NIM, Lokasi, Waktu mulai hingga waktu pulih, dan QR Code verifikasi keaslian.
  5. Dokumen diunduh oleh mahasiswa dan ditembuskan ke email Dosen Pengampu untuk membuka kembali akses pengumpulan tugas di LMS.
* **Kondisi Akhir**: Surat resmi tersimpan di database dan hak akademik mahasiswa terlindungi.

---

## 4. ACTIVITY DIAGRAM (BPMN SWIMLANE)

Diagram alur lintas entitas (Swimlane) yang menggambarkan proses bisnis secara menyeluruh dari awal insiden hingga resolusi:

```mermaid
flowchart TD
    %% Styling Swimlane
    classDef lane fill:#f8fafc,stroke:#94a3b8,stroke-width:1px;
    classDef nodeAction fill:#ffffff,stroke:#3b82f6,stroke-width:2px;
    classDef nodeDecision fill:#fef3c7,stroke:#d97706,stroke-width:2px;
    classDef nodeEnd fill:#dcfce7,stroke:#16a34a,stroke-width:2px;
    classDef nodeAlert fill:#fee2e2,stroke:#ef4444,stroke-width:2px;

    subgraph LANE_M["👤 MAHASISWA"]
        A([Mulai: Wi-Fi Putus saat Tugas]) --> B[Ambil Screenshot Bukti Error]
        B --> C{Coba Solusi Cepat:<br/>Toggle Wi-Fi / 5GHz}
        C -- "Koneksi Pulih" --> D[Lanjut Submit Tugas Daring]
        C -- "Masih Putus" --> E[Kirim Tiket Aduan Cepat via Web/WA]
        V_M[Coba Submit Ulang Tugas] --> V_RES{Apakah Berhasil?}
        V_RES -- "Ya" --> END_M([Selesai Mengerjakan])
        V_RES -- "Waktu Tugas Habis" --> REQ_CERT[Minta Surat Bukti Gangguan]
    end

    subgraph LANE_H["🎧 IT HELPDESK (TIER 1)"]
        E --> F[Terima Tiket & Validasi Data]
        F --> G{Pemeriksaan Skala Gangguan:<br/>Berapa user terdampak?}
        G -- "1 Orang Saja" --> H[Pandu Forget Network & Reset TCP/IP]
        H --> I{Apakah Terselesaikan?}
        I -- "Ya" --> CLOSE_L1[Tutup Tiket - Client Issue]
        I -- "Tidak" --> ESC_MANUAL[Eskalasi Manual ke NOC]
        G -- "≥ 2 Orang / Massal" --> ESC_URGENT[Tandai Tiket: P1 URGENT<br/>Eskalasi Otomatis ke NOC]
        RESOLVED_SIG --> NOTIF_USER[Kabari Mahasiswa: Jaringan Telah Pulih]
        REQ_CERT --> GEN_PDF[Terbitkan Surat Keterangan Resmi PDF]
        GEN_PDF --> CLOSE_FINAL[Tutup Tiket - CLOSED RESOLVED]
    end

    subgraph LANE_N["🛠️ NETWORK ADMIN / NOC (TIER 2/3)"]
        ESC_URGENT --> DIAG[Inspeksi Controller AP di Ruangan Terkait]
        ESC_MANUAL --> DIAG
        DIAG --> CHK_CAUSE{Identifikasi Titik Masalah:}
        CHK_CAUSE -- "AP Penuh" --> ACT_LB[Aktifkan Load Balancing & Band Steering]
        CHK_CAUSE -- "DHCP Habis" --> ACT_DHCP[Clear Stale Leases & Tambah Subnet]
        CHK_CAUSE -- "Interferensi" --> ACT_RF[Tuning Channel & Transmit Power]
        CHK_CAUSE -- "Trafik Liar" --> ACT_QOS[Terapkan QoS & Limit Bandwidth per User]
        ACT_LB --> TEST_STABIL[Uji Ping & Latensi Gateway < 15ms]
        ACT_DHCP --> TEST_STABIL
        ACT_RF --> TEST_STABIL
        ACT_QOS --> TEST_STABIL
        TEST_STABIL --> RESOLVED_SIG[Kirim Status RESOLVED ke Helpdesk]
    end

    NOTIF_USER --> V_M
    CLOSE_L1 --> END_M
    CLOSE_FINAL --> END_M
```

---

## 5. SEQUENCE DIAGRAM (INTERAKSI WAKTU-NYATA)

Diagram sekuensial yang merepresentasikan pertukaran pesan secara kronologis antar-komponen saat terjadi kegagalan transmisi data:

```mermaid
sequenceDiagram
    autonumber
    actor M as Mahasiswa
    participant Portal as Portal Tiket / Bot
    participant H as IT Helpdesk (L1)
    participant WLC as Controller Wi-Fi & DHCP
    participant NOC as Network Admin (L2)
    actor D as Dosen / LMS

    Note over M, D: Kondisi: Mahasiswa sedang mengerjakan kuis/tugas daring di Ruang Lab 3
    M->>M: Wi-Fi terputus / Request Timed Out (Screenshot bukti)
    M->>Portal: Submit Tiket Cepat (NIM, Ruang Lab 3, Bukti.png)
    Portal->>H: Notifikasi Tiket Baru (#TKT-042)
    
    par Korelasi Otomatis
        Portal->>WLC: Query status AP & Laporan Ruang Lab 3
        WLC-->>Portal: Terdeteksi 3 laporan serupa (AP-L3 Overload 65 user)
    end

    Portal-->>H: Flag Otomatis: GANGGUAN MASSAL (Priority: P1)
    H->>NOC: Eskalasi Tiket P1 (Detail: AP-L3 Overload & DHCP Depleted)
    
    critical Tindakan Remediasi NOC
        NOC->>WLC: Aktifkan Load Balancing ke AP-L3-Koridor
        NOC->>WLC: Flush DHCP Inactive Leases & Ubah Lease Time = 2 Jam
        NOC->>WLC: Terapkan QoS Prioritas Trafik LMS (Port 443)
        WLC-->>NOC: Konfigurasi diterapkan, Latensi Gateway = 8ms (Normal)
    end

    NOC->>H: Update Status: RESOLVED_BY_NOC
    H->>M: Kirim Notifikasi: "Sinyal Wi-Fi telah stabil, silakan coba login"
    M->>WLC: Re-koneksi Wi-Fi (Tersambung ke 5GHz)
    
    alt Skenario A: Waktu Tugas Masih Ada
        M->>D: Lanjutkan & Submit Tugas di LMS
        M->>H: Konfirmasi: Tugas Berhasil Disubmit
        H->>Portal: Tutup Tiket (#TKT-042 CLOSED)
    else Skenario B: Waktu Tugas Telah Habis
        M->>H: Request: Waktu habis saat Wi-Fi putus
        H->>Portal: Generate Digital Incident Certificate (PDF)
        Portal-->>H: PDF Terbit dengan QR Code Verifikasi
        H->>M: Kirim Dokumen PDF
        M->>D: Serahkan Surat Bukti Gangguan TI
        D->>D: Verifikasi QR Code & Buka Kembali Slot Tugas di LMS
        M->>D: Submit Tugas Susulan Berhasil
        H->>Portal: Tutup Tiket (#TKT-042 CLOSED)
    end
```

---

## 6. ENTITY RELATIONSHIP DIAGRAM (ERD) & STRUKTUR BASIS DATA

Berikut adalah rancangan basis data relasional untuk mengelola entitas pengguna, inventaris ruangan, perangkat *Access Point*, log tiket, dan sertifikat dispensasi akademik:

### A. Diagram Relasi Entitas (Mermaid ERD)

```mermaid
erDiagram
    PENGGUNA ||--o{ TIKET_INSIDEN : "melaporkan"
    RUANGAN ||--o{ TIKET_INSIDEN : "lokasi_kejadian"
    RUANGAN ||--o{ ACCESS_POINT : "memiliki"
    ACCESS_POINT ||--o{ LOG_TELEMETRI_AP : "merekam"
    TIKET_INSIDEN ||--o| SURAT_DISPENSASI : "menghasilkan"
    TIKET_INSIDEN ||--o{ TINDAKAN_PENANGANAN : "memiliki_riwayat"
    PENGGUNA ||--o{ TINDAKAN_PENANGANAN : "dieksekusi_oleh"

    PENGGUNA {
        string user_id PK "NIM / NIP Staf"
        string nama "Nama Lengkap"
        string email "Email Kampus"
        string no_whatsapp "Kontak Darurat"
        string peran "Mahasiswa / Helpdesk / NOC / Dosen"
        string mac_address_default "MAC Address Laptop"
    }

    RUANGAN {
        string id_ruangan PK "Contoh: GD-B-LT2-R204"
        string nama_gedung "Nama Gedung Kuliah"
        int nomor_lantai "Lantai"
        string nama_ruangan "Nama Ruang / Lab"
        int kapasitas_mahasiswa "Kapasitas Maksimal Kursi"
    }

    ACCESS_POINT {
        string ap_mac PK "MAC Address AP"
        string ap_name "Contoh: AP-GedB-L2-01"
        string id_ruangan FK "Lokasi Ruang"
        string ip_management "IP Address AP"
        string model_ap "Cisco / Aruba / UniFi"
        int max_client_limit "Batas Maksimal Klien"
        string status_operasional "Online / Degraded / Offline"
    }

    TIKET_INSIDEN {
        string no_tiket PK "Contoh: TKT-202611-0042"
        string user_id FK "Pelapor"
        string id_ruangan FK "Lokasi Kendala"
        string ap_mac FK "AP Terhubung (Optional)"
        datetime waktu_lapor "Stempel Waktu Masuk"
        string prioritas "P1-Critical / P2-High / P3-Normal"
        string status_tiket "OPEN / IN_PROGRESS / RESOLVED / CLOSED"
        string kategori_masalah "AP_Overload / DHCP_Exhausted / Client_Config / RF_Noise"
        string url_bukti_screenshot "Path / Link Bukti Error"
    }

    LOG_TELEMETRI_AP {
        bigint id_log PK "Auto Increment"
        string ap_mac FK "MAC AP"
        datetime timestamp_perekaman "Waktu Log"
        int connected_clients "Jumlah User Aktif"
        float cpu_utilization "Persentase CPU (%)"
        float packet_loss_ratio "Rasio Drop Packet (%)"
        int dhcp_pool_remaining "Sisa Alamat IP Subnet"
    }

    TINDAKAN_PENANGANAN {
        bigint id_tindakan PK "Auto Increment"
        string no_tiket FK "Nomor Tiket Terkait"
        string operator_id FK "ID Helpdesk / NOC"
        datetime waktu_tindakan "Waktu Eksekusi"
        string aksi_teknis "Reboot AP / Flush DHCP / Band Steering / Config Reset"
        string catatan_teknis "Hasil Pengujian Ping & Latensi"
    }

    SURAT_DISPENSASI {
        string no_surat PK "Contoh: DISP-TI/2026/XI/088"
        string no_tiket FK "Nomor Tiket Acuan"
        string nama_mata_kuliah "Mata Kuliah Terkait"
        string nama_dosen "Dosen Pengampu"
        datetime waktu_mulai_gangguan "Awal Terputus"
        datetime waktu_selesai_gangguan "Waktu Jaringan Pulih"
        string url_qr_verification "Tautan Validasi Digital Keaslian"
        string status_persetujuan_dosen "Menunggu / Disetujui / Ditolak"
    }
```

---

### B. Kamus Data & Normalisasi Tabel

1. **Integritas Relasi**:
   * Setiap `TIKET_INSIDEN` wajib mengacu pada 1 `PENGGUNA` (pelapor) dan 1 `RUANGAN`.
   * Satu `RUANGAN` dapat memiliki 1 atau lebih unit `ACCESS_POINT`.
   * Tabel `LOG_TELEMETRI_AP` dipartisi berdasarkan stempel waktu (*time-series data*) untuk mendukung analisis audit historis (NFR-08).
   * Tabel `SURAT_DISPENSASI` berelasi *one-to-one* dengan `TIKET_INSIDEN` yang berprioritas P1 untuk memastikan tidak ada duplikasi surat untuk insiden yang sama.

2. **Indeks Performa (Database Indexing)**:
   * Indeks komposit pada `TIKET_INSIDEN (id_ruangan, waktu_lapor)` untuk mempercepat algoritma *Auto-Clustering* (FR-02) dalam waktu respon < 100 ms.
   * Indeks pada `LOG_TELEMETRI_AP (ap_mac, timestamp_perekaman)` guna mendukung visualisasi *Heatmap Real-Time* (FR-03).

---
*Dokumen pemodelan sistem ini melengkapi spesifikasi fungsional & non-fungsional sebagai acuan implementasi kode dan penyusunan laporan proyek.*
