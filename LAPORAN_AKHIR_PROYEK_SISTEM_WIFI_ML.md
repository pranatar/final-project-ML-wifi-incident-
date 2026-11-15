# LAPORAN AKHIR PROYEK SISTEM CERDAS
## IMPLEMENTASI MACHINE LEARNING XGBOOST UNTUK OTOMASI TRIASE PRIORITAS DAN PREDIKSI SLA INSIDEN WI-FI KAMPUS (UPT TIK)

---

### IDENTITAS PROYEK
* **Judul Proyek**: Sistem Resolusi Insiden Wi-Fi Tugas Daring Mahasiswa Berbasis Machine Learning XGBoost
* **Unit Kerja/Kasus**: Unit Pelaksana Teknis Teknologi Informasi dan Komunikasi (UPT TIK)
* **Kategori Proyek**: Supervised Learning, Multi-class Classification, Regression, Clustering
* **AI Coding Assistant**: Gemini Antigravity
* **Framework Utama**: XGBoost 3.2, Scikit-learn 1.9, Node.js v22, Flask, SQLite 3
* **Repository GitHub**: [https://github.com/pranatar/final-project-ML-wifi-incident-.git](https://github.com/pranatar/final-project-ML-wifi-incident-.git)

---

## BAB 1: PENDAHULUAN & LATAR BELAKANG

### 1.1 Latar Belakang Masalah
Kebutuhan konektivitas internet nirkabel di lingkungan perguruan tinggi semakin krusial, terutama saat mahasiswa melaksanakan ujian daring atau pengunggahan tugas akhir dengan batas waktu (*deadline*) ketat melalui *Learning Management System* (LMS). Gangguan jaringan seperti kelebihan beban pada *Access Point* (AP Overload), kehabisan alokasi IP (DHCP Exhaustion), atau tingginya interferensi radio (RF Noise) sering kali menyebabkan kegagalan submit tugas.

Sebelum sistem ini dibangun, terdapat kendala mendasar:
1. **Ketiadaan Sistem Triase Cepat**: Helpdesk memproses keluhan mahasiswa secara manual tanpa korelasi geografis dan telemetri jaringan.
2. **Ketiadaan Bukti Sah**: Dosen pengampu meragukan klaim mahasiswa mengenai gangguan jaringan karena tidak ada sertifikat bukti insiden resmi yang terverifikasi.
3. **Respon NOC yang Reaktif**: Teknisi NOC baru menyadari lonjakan beban setelah puluhan komplain masuk secara terpisah.

### 1.2 Rumusan Masalah
1. Bagaimana mendeteksi insiden massal secara otomatis berdasarkan waktu dan lokasi ruangan pelapor?
2. Bagaimana menerapkan model Machine Learning (XGBoost) untuk memprediksi tingkat prioritas insiden (P1-Critical, P2-High, P3-Normal) dan mengestimasi durasi penyelesaian (SLA) secara akurat?
3. Bagaimana menerbitkan dokumen bukti dispensasi akademik digital yang aman dari pemalsuan menggunakan verifikasi token QR?

### 1.3 Tujuan Proyek
1. Mengembangkan sistem manajemen insiden terpadu berbasis ITIL/ITSM yang menghubungkan Mahasiswa, Helpdesk L1, dan Teknisi NOC L2.
2. Melatih dan mengintegrasikan model Machine Learning **XGBoost Classifier** (klasifikasi prioritas) dan **XGBoost Regressor** (estimasi waktu penyelesaian).
3. Menerapkan mekanisme remediasi jaringan cepat (*Dynamic Load Balancing, DHCP Lease Flush*) dan penerbitan surat keterangan dispensasi ber-QR Code.

---

## BAB 2: ARSITEKTUR SISTEM & PERANCANGAN BASIS DATA

### 2.1 Arsitektur Full-Stack & Microservice
Sistem dirancang menggunakan arsitektur modular yang menggabungkan kecepatan engine I/O Node.js dengan kapabilitas komputasi analitik Python:
* **Frontend**: Single Page Application terpadu (Tailwind CSS, FontAwesome, Fetch API).
* **Core Backend**: Node.js v22 HTTP Server dengan native SQLite RDBMS (`port 3000`).
* **ML Microservice**: Python 3.11 Flask API melayani inferensi model XGBoost (`port 5001`).
* **Graceful Degradation**: Jika microservice Python dalam status nonaktif, backend secara otomatis beralih (*fallback*) ke *rule-based clustering* tanpa memutus alur pengguna.

### 2.2 Skema Basis Data Relasional (SQLite)
Basis data terdiri dari 7 tabel berelasi:
1. `pengguna`: Profil akun mahasiswa, helpdesk, teknisi NOC, dan dosen pengampu.
2. `ruangan`: Master data gedung, lantai, ruangan, dan kapasitas mahasiswa.
3. `access_point`: Data inventaris AP, MAC address, kanal radio, dan status operasional.
4. `tiket_insiden`: Entitas utama laporan tiket, gejala gangguan, status, prioritas, dan clustering.
5. `log_telemetri_ap`: Time-series telemetri utilisasi CPU, memory, packet loss, latensi, dan pool DHCP.
6. `tindakan_penanganan`: Audit trail tindakan teknis mitigasi helpdesk dan NOC.
7. `surat_dispensasi`: Metadata sertifikat insiden resmi lengkap dengan token SHA-256 verifikasi QR.

---

## BAB 3: METODOLOGI MACHINE LEARNING (XGBOOST)

### 3.1 Dataset & Feature Engineering
Dataset pelatihan dibangun secara sintetis-realistis sebanyak 800 sampel berbasis distribusi parameter telemetri kampus nyata:
* **Fitur Input ($X$)**:
  1. `connected_clients`: Jumlah pengguna aktif terhubung pada AP (1 - 75 klien).
  2. `cpu_utilization`: Utilisasi prosesor AP (5.0% - 100.0%).
  3. `memory_utilization`: Utilisasi memori AP (10.0% - 100.0%).
  4. `packet_loss_ratio`: Rasio kehilangan paket data (0.0% - 30.0%).
  5. `latency_gateway_ms`: Waktu bolak-balik latensi gateway (5 ms - 300 ms).
  6. `dhcp_pool_remaining`: Sisa alokasi IP DHCP pool (0 - 200 IP).
  7. `is_emergency_deadline`: Status urgensi batas waktu tugas kuliah (0 atau 1).
  8. `cluster_count`: Jumlah laporan serupa di ruangan yang sama dalam rentang 15 menit.
  9. `is_clustered`: Indikator insiden massal (0 atau 1).
  10. `hour_of_day`: Jam operasional kampus (07:00 - 21:00 WIB).

### 3.2 Pemodelan XGBoost
* **Model 1: XGBClassifier (Triase Prioritas Tiket)**:
  * Objektif: `multi:softprob` (3 kelas target: `P3-NORMAL`, `P2-HIGH`, `P1-CRITICAL`).
  * Konfigurasi: `n_estimators=100`, `max_depth=4`, `learning_rate=0.08`.
* **Model 2: XGBRegressor (Estimasi Waktu Resolusi SLA)**:
  * Objektif: `reg:squarederror` (Target kontinu dalam satuan menit).
  * Konfigurasi: `n_estimators=120`, `max_depth=4`, `learning_rate=0.05`.

---

## BAB 4: HASIL PENGUJIAN DAN EVALUASI

### 4.1 Evaluasi Performa Model Machine Learning
Pengujian dilakukan menggunakan metode *Stratified Train-Test Split* (rasio 80:20):

#### A. Hasil Klasifikasi Prioritas (XGBClassifier)
```
              precision    recall  f1-score   support

   P3-NORMAL       0.97      0.97      0.97        36
     P2-HIGH       0.95      0.95      0.95        22
 P1-CRITICAL       0.99      0.99      0.99       102

    accuracy                           0.98       160
   macro avg       0.97      0.97      0.97       160
weighted avg       0.98      0.98      0.98       160
```
* **Akurasi Keseluruhan**: **98.0%**
* **Precision Kelas P1-Critical**: **99.0%** (meminimalkan false negative pada kondisi darurat).

#### B. Hasil Regresi Waktu Resolusi (XGBRegressor)
* **Root Mean Squared Error (RMSE)**: **5.50 menit**
* **Koefisien Determinasi ($R^2$)**: **0.756** (Model menjelaskan 75.6% varians durasi penanganan insiden).

### 4.2 Hasil Automated Integration Test Suite (`npm test`)
Pengujian end-to-end mencakup 11 skenario kasus uji:
```text
======================================================
🧪 MENJALANKAN AUTOMATED TEST SUITE API BACKEND
======================================================
⏳ Menguji: GET /api/health (Status Server) ..................... ✅ [LULUS]
⏳ Menguji: GET /api/rooms (Daftar Ruangan Kampus) .............. ✅ [LULUS]
⏳ Menguji: GET /api/access-points (Telemetri AP) ............... ✅ [LULUS]
⏳ Menguji: GET /api/stats (Ringkasan Metrik NOC) ............... ✅ [LULUS]
⏳ Menguji: POST /api/tickets (Pelaporan Tiket Tunggal) .......... ✅ [LULUS]
⏳ Menguji: POST /api/tickets (Auto-Clustering & P1 Escalation) .. ✅ [LULUS]
⏳ Menguji: POST /api/remediation (Remediasi Beban AP) .......... ✅ [LULUS]
⏳ Menguji: POST /api/dispensations (Penerbitan Surat Resmi) ..... ✅ [LULUS]
⏳ Menguji: GET /api/dispensations/verify/:token (Verifikasi QR) . ✅ [LULUS]
⏳ Menguji: PATCH /api/dispensations/verify/:token/approve ...... ✅ [LULUS]
⏳ Menguji: POST /api/ml/predict (Prediksi Prioritas & SLA XGB) .. ✅ [LULUS]
======================================================
📊 HASIL PENGUJIAN: 11 LULUS, 0 GAGAL (100% SUCCESS)
======================================================
```

---

## BAB 5: KESIMPULAN

1. Sistem berhasil mengintegrasikan pelaporan insiden darurat, analitik cerdas XGBoost, mitigasi jaringan terpusat oleh NOC, dan administrasi surat dispensasi ber-QR code dalam satu platform terpadu.
2. Model Machine Learning XGBoost terbukti efektif dengan akurasi klasifikasi 98% dan estimasi SLA dengan RMSE 5.5 menit, menggantikan triase manual yang lambat.
3. Seluruh komponen sistem teruji stabil, modular, dan terdokumentasi lengkap pada repository GitHub proyek.

