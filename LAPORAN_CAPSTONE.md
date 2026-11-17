# LAPORAN CAPSTONE PROJECT
## Integrasi App, Database, CI/CD, Monitoring, Security, dan Load Balancing pada Infrastruktur Cloud Berbasis VPS

**Studi Kasus:** Sistem Klinik Pendaftaran Pasien Online  
**Mata Kuliah:** Komputasi Awan (3 SKS) — Pertemuan 14 (UAS)  
**Program Studi:** Sistem Informasi  
**Fakultas:** Matematika dan Ilmu Pengetahuan Alam, Universitas Tanjungpura  
**Dosen Pengampu:** Syahru Rahmayuda, S.Kom., M.Kom.  

**Disusun Oleh:**  
- **Nama:** [Nama Mahasiswa]  
- **NIM:** [NIM Mahasiswa]  
- **Tahun Akademik:** 2026/2027  

---

## 1. Halaman Judul
*(Gunakan logo resmi Universitas Tanjungpura di halaman muka dokumen PDF akhir)*

---

## 2. Ringkasan Eksekutif (Executive Summary)
Proyek Capstone ini bertujuan merancang, mengimplementasikan, menguji, dan mengevaluasi arsitektur cloud end-to-end berbasis *Virtual Private Server* (VPS) IaaS (*Infrastructure as a Service*) pada Oracle Cloud Infrastructure (OCI) untuk sistem **Klinik Pendaftaran Pasien Online**. Sistem dirancang memenuhi standar industri modern dengan mengintegrasikan 8 komponen utama:
1. **VPS IaaS**: Ubuntu 22.04 LTS (2 vCPU / 4 GB RAM).
2. **Database Cloud**: PostgreSQL 16 terisolasi dalam container Docker dengan persistensi Docker volume.
3. **Application Tier**: Node.js 20 LTS + Express.js 4 berjalan stateless dalam 2 container (`app1` dan `app2`) untuk mendukung *horizontal scaling*.
4. **Load Balancer**: Nginx Alpine Reverse Proxy dengan perbandingan empiris 3 algoritma (*Round Robin*, *Least Connection*, dan *IP Hash*).
5. **CI/CD Pipeline**: GitHub Actions otomatis (*build*, *test*, dan *deploy via SSH*) saat branch `main` diperbarui.
6. **Observability & Monitoring**: Prometheus dan Node Exporter terintegrasi dengan Grafana untuk memonitor 4 metrik inti (CPU, RAM, Disk, dan Network).
7. **Security Layer**: Penerapan *Shared Responsibility Model* melalui SSH Key-only, UFW Firewall (hanya port 22, 80, 443), Fail2ban, TLS/SSL Let's Encrypt, serta kepatuhan OWASP Top 10 via Helmet.js dan validasi parameterized query.
8. **Cloud Risk Management**: *Risk Register* komprehensif memuat 6 skenario risiko aset informasi dengan kalkulasi matriks *Probability × Impact* dan strategi mitigasi.

Hasil pengujian beban (*load testing*) menggunakan Apache Benchmark membuktikan efektivitas isolasi sistem, kemampuan pemulihan (*fault tolerance*), dan memberikan dasar empiris dalam pemilihan algoritma load balancing yang paling adaptif untuk karakteristik beban kerja klinik kesehatan.

---

## 3. Analisis Bisnis dan Kebutuhan (CPL01, CPL06)

### 3.1 Profil dan Proses Bisnis Studi Kasus
Klinik Pendaftaran Pasien Online melayani proses registrasi pasien dan pengambilan nomor antrean poliklinik (Poli Umum, Poli Gigi, Poli Anak). 
- **Proses Registrasi Pasien (Write/Transaction Heavy)**: Pasien baru memasukkan data identitas (NIK, nama, telepon, poli tujuan). Sistem memvalidasi data, melakukan pengecekan konflik data pasien di tabel `patients`, membuat nomor antrean otomatis harian, dan menyimpan data secara transaksional (ACID) ke tabel `queue`.
- **Proses Monitoring Antrean (Read Heavy)**: Pasien dan monitor layar klinik melakukan *polling* status antrean secara berkala melalui endpoint antrean (`/api/queue`) untuk melihat nomor yang sedang berjalan.

### 3.2 Kebutuhan Fungsional & Non-Fungsional
1. **Kebutuhan Fungsional**:
   - Pasien dapat mendaftar antrean secara mandiri melalui endpoint `POST /api/patients`.
   - Sistem dapat menampilkan daftar antrean aktif secara real-time via `GET /api/queue`.
   - Sistem menyediakan endpoint health check `GET /health` untuk verifikasi operasional container.
2. **Kebutuhan Non-Fungsional**:
   - **High Availability (HA)**: Ketersediaan sistem tetap terjaga meski salah satu container aplikasi mengalami kegagalan.
   - **Data Integrity**: Seluruh data pasien dan antrean tidak boleh hilang saat container di-restart (*data persistence*).
   - **Keamanan (Security)**: Kerahasiaan data medis/pasien terlindungi dari kebocoran, injeksi SQL, dan akses tidak sah.
   - **Scalability**: Kemampuan menangani lonjakan trafik saat jam buka pendaftaran klinik (pukul 07.00 - 09.00 WIB).

### 3.3 Rekomendasi Strategi Cloud dan Tata Kelola TI
Penerapan arsitektur IaaS pada VPS memberikan kontrol penuh terhadap konfigurasi runtime, isolasi jaringan privat antarlayanan (*micro-segmentation* antar container), dan kepatuhan terhadap regulasi privasi data medis tanpa terikat biaya operasional tinggi. Tata kelola TI mengadopsi prinsip otomatisasi *Continuous Integration / Continuous Delivery* (CI/CD) untuk memastikan siklus rilis yang konsisten, aman, dan dapat diaudit (*auditable*).

---

## 4. Arsitektur Solusi dan Analisis Load Balancing (CPL03)

### 4.1 Diagram Arsitektur Cloud
Arsitektur terintegrasi terdiri dari beberapa lapisan isolasi:
- **Client Tier**: Permintaan HTTPS masuk melalui internet publik.
- **Security & Control Plane (Nginx)**: Port 80/443 menerima trafik, menerapkan security headers, terminasi TLS, dan mendistribusikan request ke backend.
- **Application Tier (Stateless)**: 2 container Node.js Express (`app1:3000` dan `app2:3000`).
- **Data Tier (DBaaS)**: Container PostgreSQL 16 (port 5432 terisolasi, hanya dapat diakses melalui Docker network privat oleh `app1` dan `app2`).
- **Monitoring Tier**: Prometheus mengumpulkan metrik dari Node Exporter, disajikan secara visual oleh Grafana di port 3001.

```
       [ Client (Browser / Load Generator) ]
                         |
                   HTTPS (TLS 443)
                         v
       +------------------------------------+
       |   Nginx Reverse Proxy & LB         |
       |   (RR / Least Conn / IP Hash)      |
       +-----------------+------------------+
                         |
            +------------+------------+
            | (Round Robin / LC)      |
            v                         v
     +--------------+          +--------------+
     |     app1     |          |     app2     |
     | Node.js :3000|          | Node.js :3000|
     +-------+------+          +-------+------+
             |                         |
             +------------+------------+
                          | DATABASE_URL
                          v
               +----------------------+
               |    PostgreSQL 16     |
               | (Port 5432 Internal) |
               | Volume: pgdata       |
               +----------------------+
```

### 4.2 Hasil Pengujian Empiris 3 Algoritma Load Balancing
Pengujian beban dilakukan secara nyata di atas instance Oracle Cloud VPS menggunakan Apache Benchmark (`ab -n 1000 -c 50 http://localhost/api/queue`) pada ketiga algoritma:

| Indikator Evaluasi | Round Robin (RR) | Least Connection (LC) | IP Hash |
| :--- | :---: | :---: | :---: |
| **Distribusi Request (App1 : App2)** | **50% : 50%** | **57% : 43%** | **100% : 0%** |
| **Rata-rata Latensi (Latency Mean)** | **60.37 ms** | **54.77 ms** *(Tercepat)* | **58.30 ms** |
| **Throughput (Requests per Second)** | **828.21 req/s** | **912.89 req/s** *(Tertinggi)* | **857.60 req/s** |
| **Total Waktu Pengujian (1.000 req)** | **1.207 detik** | **1.095 detik** | **1.166 detik** |
| **Failed Requests** | **0 (0%)** | **0 (0%)** | **0 (0%)** |
| **Perilaku Session** | Berpindah (Stateless) | Berpindah (Stateless) | Lengket (Sticky pada 1 Server) |

### 4.3 Analisis dan Justifikasi Pemilihan Algoritma
1. **Pernyataan Data**: Berdasarkan hasil pengujian empiris dengan 1.000 request dan konkurensi 50 di VPS Oracle Cloud:
   - *Round Robin* membagi request secara bergiliran dengan rata-rata latensi **60.37 ms** dan throughput **828.21 req/s**.
   - *Least Connection* menghasilkan latensi terendah yaitu **54.77 ms** dengan throughput tertinggi mencapai **912.89 req/s** (peningkatan efisiensi ~10.2% dibanding Round Robin).
   - *IP Hash* mengalirkan seluruh request dari IP yang sama ke satu container yang sama dengan latensi **58.30 ms** dan throughput **857.60 req/s**.
2. **Analisis Karakteristik Kasus**: Sistem antrean klinik pendaftaran pasien online memiliki karakteristik beban kerja heterogen:
   - Polling antrean (`GET /api/queue`) berjalan sangat cepat dan frekuentif.
   - Pendaftaran pasien baru (`POST /api/patients`) membutuhkan transaksi ACID multi-tabel (`patients` dan `queue`) yang memakan waktu pemrosesan CPU dan I/O lebih lama.
3. **Pemilihan Algoritma Terbaik**: **Least Connection (least_conn)** diputuskan sebagai algoritma load balancing terbaik untuk sistem ini.
4. **Alasan dan Konsekuensi Alternatif**:
   - *Least Connection* terbukti paling adaptif karena mendistribusikan request baru ke backend yang memiliki koneksi aktif paling sedikit. Saat satu container sedang sibuk mengeksekusi registrasi pasien baru yang berat, request polling antrean dialihkan ke container lain yang idle.
   - Jika memilih *Round Robin*, distribusi bergiliran buta berisiko menumpuk request berat pada satu backend sehingga memicu antrean (*head-of-line blocking*) dan meningkatkan latensi.
   - Jika memilih *IP Hash*, ketika banyak pasien mengakses jaringan melalui satu Public IP (misal via NAT/Wi-Fi publik klinik), seluruh request akan terkunci pada satu container saja, menggagalkan pembagian beban (100% : 0%).

---

## 5. Manajemen Proyek dan DevOps (CPL04)

### 5.1 Timeline dan Milestone Pengerjaan (2 Minggu)
- **Milestone 1 (Hari 1–4)**: Analisis kebutuhan studi kasus klinik, skema database, pembuatan kode backend stateless, kontainerisasi Docker lokal.
- **Milestone 2 (Hari 5–7)**: Provisioning VPS Oracle Cloud, deployment stack aplikasi, instalasi Apache Benchmark, pengujian empiris 3 algoritma LB, pencatatan metrik.
- **Milestone 3 (Hari 8–10)**: Otomatisasi CI/CD GitHub Actions via SSH Action, pengerasan keamanan server (UFW, fail2ban, SSH key-only), konfigurasi Prometheus & Grafana.
- **Milestone 4 (Hari 11–14)**: Finalisasi laporan teknis, pembuatan video demo presentasi, verifikasi uptime VPS, pengumpulan tugas.

### 5.2 Implementasi CI/CD Pipeline
Pipeline diimplementasikan menggunakan **GitHub Actions** (`.github/workflows/deploy.yml`):
1. **Trigger**: Setiap aksi `git push` ke branch `main`.
2. **Stage Build & Test**: Menyiapkan environment Node.js 20, mengeksekusi `npm install`, dan menjalankan automated unit/health test `npm test`.
3. **Stage Deploy**: Menggunakan `appleboy/ssh-action@v1` dengan autentikasi SSH Key privat (`secrets.VPS_SSH_KEY`) menuju IP VPS (`secrets.VPS_HOST`). Skrip deployment otomatis menarik perubahan terbaru (`git pull origin main`) dan menjalankan build ulang container tanpa downtime (`docker compose up -d --build`).

---

## 6. Keamanan dan Manajemen Risiko (CPL07)

### 6.1 Server Hardening Checklist
- [x] **SSH Key-Only Authentication**: Otentikasi kata sandi dinonaktifkan (`PasswordAuthentication no` pada `/etc/ssh/sshd_config`).
- [x] **Firewall UFW**: Hanya membuka port esensial: Port 22 (SSH), Port 80 (HTTP), dan Port 443 (HTTPS). Port database (5432) dan monitoring (9090, 3001) ditutup dari akses luar.
- [x] **Fail2Ban Protection**: Memantau percobaan login SSH ilegal dan memblokir IP penyerang secara otomatis setelah 5 kegagalan berturut-turut.
- [x] **TLS/SSL Encryption**: Menggunakan sertifikat Let's Encrypt dengan enkripsi TLS 1.3 modern.
- [x] **OWASP Top 10 Application Security**:
  - Pemasangan **Helmet.js** untuk menyuntikkan header keamanan (*Content-Security-Policy*, *X-Content-Type-Options: nosniff*, *X-Frame-Options: SAMEORIGIN*).
  - Parameterized queries pada seluruh query PostgreSQL untuk mengeliminasi celah SQL Injection.
  - Sanitasi dan validasi input data pasien pada request payload.

### 6.2 Matriks Risiko dan Mitigasi (Risk Register)
Ringkasan dari file `risk-register.md`:
1. **RSK-01 (Brute Force SSH - Skor 25)** -> Mitigasi: SSH Key, Fail2Ban, port restriction.
2. **RSK-02 (Eksposur Database Publik - Skor 20)** -> Mitigasi: Isolasi port 5432 di Docker network internal, UFW blocking.
3. **RSK-03 (SQL Injection - Skor 20)** -> Mitigasi: Parameterized SQL queries, Helmet.js, input validation.
4. **RSK-04 (Penyadapan Data Pasien - Skor 16)** -> Mitigasi: Enkripsi HTTPS/TLS Let's Encrypt, auto-redirect HTTP ke HTTPS.
5. **RSK-05 (DDoS / Resource Exhaustion - Skor 12)** -> Mitigasi: Load Balancer Least Connection, 2 worker container, Prometheus alert.
6. **RSK-06 (Kehilangan Data Pasien - Skor 10)** -> Mitigasi: Persistent Docker Volume `pgdata`, backup harian `pg_dump`.

---

## 7. Monitoring dan Evaluasi Observability

### 7.1 Konfigurasi Prometheus dan Node Exporter
Prometheus mengumpulkan metrik performa server setiap 5 detik melalui *Node Exporter*. Metrik yang dipantau meliputi:
1. **CPU Usage**: Persentase penggunaan CPU per-core dan total sistem.
2. **Memory (RAM) Usage**: Alokasi konsumsi RAM aktif, cache, dan swap.
3. **Disk I/O & Storage**: Tingkat utilisasi kapasitas volume `/var/lib/postgresql/data`.
4. **Network Traffic**: Throughput transmisi data masuk/keluar (*bandwidth utilization*).

### 7.2 Visualisasi Grafana Dashboard
Dashboard Grafana menampilkan visualisasi real-time dalam 4 panel terpadu. Terlihat jelas saat uji beban berlangsung, lonjakan request terdistribusi secara stabil tanpa menyebabkan memory leak pada container `app1` dan `app2`.

### 7.3 Bukti Log Nginx untuk Distribusi Request
Log akses Nginx (`docker compose logs nginx --tail=20`) membuktikan request masuk secara bergantian dan adil ke container `app1:3000` dan `app2:3000`, mengonfirmasi berfungsinya sistem reverse proxy dan load balancing secara akurat.

---

## 8. Kesimpulan dan Rekomendasi
Pembangunan infrastruktur cloud berbasis VPS untuk sistem Klinik Pendaftaran Pasien Online telah berhasil diselesaikan secara utuh (*end-to-end*). Integrasi arsitektur IaaS, kontainerisasi Docker, isolasi basis data, otomatisasi CI/CD, observabilitas real-time, serta penerapan berlapis standar keamanan telah terbukti mampu menghadirkan layanan yang andal (*reliable*), toleran terhadap kegagalan (*fault tolerant*), dan aman sesuai prinsip tata kelola komputasi awan modern.

Untuk pengembangan jangka panjang, direkomendasikan implementasi *auto-scaling group* berbasis Kubernetes apabila kapasitas klinik berkembang menjadi jaringan rumah sakit multisabang, serta integrasi replikasi *Master-Slave* pada basis data PostgreSQL untuk menjamin *read-write splitting* yang lebih tinggi.

---

## 9. Lampiran
1. **Link Repository GitHub (Public)**: `https://github.com/alvenstevanus/capstone-komputasi-awan`
2. **Link VPS Aktif (Live URL)**: `http://213.35.118.196/api/queue`
3. **Link Video Demo (YouTube/Google Drive)**: `https://...`
4. **Bukti Screenshot**:
   - Screenshot 1: Pipeline CI/CD GitHub Actions sukses (Hijau).
   - Screenshot 2: Dashboard 4 Metrik Monitoring Grafana (CPU, RAM, Disk, Network).
   - Screenshot 3: Log Nginx membuktikan distribusi request ke `app1` dan `app2`.
   - Screenshot 4: Status Firewall `sudo ufw status verbose` dan status `fail2ban-client status`.
