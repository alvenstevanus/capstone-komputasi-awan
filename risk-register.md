# Risk Register & Analisis Risiko Keamanan Cloud
**Studi Kasus:** Klinik Pendaftaran Pasien Online  
**Mata Kuliah:** Komputasi Awan (3 SKS) — Capstone Project Pertemuan 14  
**Standar Acuan:** ISO 27005 / NIST SP 800-30 & OWASP Top 10  

---

## 1. Metodologi Penilaian Risiko
Skor Risiko dihitung menggunakan rumus:
$$\text{Risk Score} = \text{Probability (P)} \times \text{Impact (I)}$$

### Skala Probabilitas (P):
- 1 = Sangat Jarang (Rare)
- 2 = Jarang (Unlikely)
- 3 = Mungkin (Possible)
- 4 = Sering (Likely)
- 5 = Sangat Sering (Almost Certain)

### Skala Dampak (I):
- 1 = Tidak Signifikan (Insignificant)
- 2 = Minor (Minor)
- 3 = Sedang (Moderate)
- 4 = Mayor (Major)
- 5 = Katastropik / Bencana (Catastrophic)

### Matriks Kategori Risiko:
- **1 – 5**: Rendah (Low - Green)
- **6 – 12**: Sedang (Medium - Yellow)
- **13 – 19**: Tinggi (High - Orange)
- **20 – 25**: Kritis (Critical - Red)

---

## 2. Tabel Risk Register (Minimal 5 Risiko Keamanan Cloud)

| ID Risiko | Deskripsi Risiko | Kategori Aset | Probabilitas (P) | Dampak (I) | Skor Risiko (P×I) | Tingkat Risiko | Rencana Mitigasi & Kontrol Keamanan | Status Implementasi |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| **RSK-01** | **Serangan Brute Force SSH pada Port VPS**<br>Penyerang mencoba kombinasi username & password secara terus-menerus melalui internet publik untuk mengambil alih hak akses root server. | Server OS (IaaS) | 5 | 5 | **25** | **Kritis** | 1. Nonaktifkan otentikasi password (`PasswordAuthentication no`).<br>2. Wajibkan SSH Key-Pair Authentication.<br>3. Pasang & aktifkan **Fail2Ban** untuk memblokir IP setelah 3-5 kali percobaan gagal.<br>4. Batasi akses port 22 hanya melalui firewall UFW. | Terpasang & Aktif |
| **RSK-02** | **Eksposur Port Database PostgreSQL ke Publik**<br>Port database (5432) terekspos langsung ke internet tanpa isolasi jaringan sehingga rentan dibobol dari luar. | Data Medis Pasien (DBaaS) | 4 | 5 | **20** | **Kritis** | 1. Isolasi port 5432 di dalam internal Docker Network.<br>2. Jangan mempublikasikan port 5432 ke host publik pada `docker-compose.yml` (hanya diakses via service `db`).<br>3. Firewall UFW hanya membuka port 22, 80, dan 443.<br>4. Lakukan backup berkala menggunakan `pg_dump`. | Terpasang & Terisolasi |
| **RSK-03** | **Serangan SQL Injection & Input Malformed**<br>Penyerang memasukkan payload SQL berbahaya melalui parameter request POST `/api/patients` untuk mencuri/menghapus data riwayat pasien. | Aplikasi (OWASP Top 10) | 4 | 5 | **20** | **Kritis** | 1. Gunakan parameterized queries / prepared statements pada driver PostgreSQL (`pg`).<br>2. Validasi ketat format NIK, nomor telepon, dan nama pada level controller Express.<br>3. Pasang **Helmet.js** untuk mencegah MIME-sniffing, XSS, dan clickjacking. | Terpasang di Kode App |
| **RSK-04** | **Penyadapan Data Sensitif Pasien (Man-in-the-Middle)**<br>Data NIK, nama, dan keluhan pasien dikirim melalui protokol HTTP tanpa enkripsi, memungkinkan interception di jaringan publik/Wi-Fi. | Jaringan & Data in Transit | 4 | 4 | **16** | **Tinggi** | 1. Terapkan enkripsi end-to-end HTTPS menggunakan sertifikat **TLS/SSL Let's Encrypt** via Certbot.<br>2. Paksa pengalihan HTTP (port 80) ke HTTPS (port 443) pada Nginx.<br>3. Terapkan HTTP Strict Transport Security (HSTS). | Terpasang pada Nginx & TLS |
| **RSK-05** | **DDoS / HTTP Flood & Resource Exhaustion**<br>Lonjakan trafik masif ke endpoint antrean membuat CPU/RAM server 100%, menyebabkan layanan pendaftaran klinik offline (downtime). | Ketersediaan Layanan (HA) | 3 | 4 | **12** | **Sedang** | 1. Implementasikan Horizontal Scaling dengan 2 container app (`app1`, `app2`).<br>2. Konfigurasi **Nginx Load Balancer** dengan algoritma *Least Connection* / *Round Robin* untuk membagi beban secara merata.<br>3. Pasang monitoring **Prometheus + Node Exporter + Grafana** untuk mendeteksi lonjakan spike secara real-time. | Terpasang & Tervalidasi |
| **RSK-06** | **Kehilangan Data Medis Akibat Kegagalan Container/Disk**<br>Container PostgreSQL rusak atau terjadi restart mendadak pada instance VPS sehingga seluruh histori pendaftaran hilang. | Integritas Data (Storage) | 2 | 5 | **10** | **Sedang** | 1. Gunakan Docker Named Volume (`pgdata`) untuk persistensi data di luar siklus hidup container.<br>2. Terapkan skrip pencadangan otomatis harian (`pg_dump`) yang disimpan di direktori backup terpisah. | Terpasang via Volume |

---

## 3. Matriks Evaluasi Risiko (Risk Matrix)

```
Dampak (Impact)
  5 | [RSK-06]      |               | [RSK-02]      | [RSK-01], [RSK-03]
  4 |               |               | [RSK-05]      | [RSK-04]
  3 |               |               |               |
  2 |               |               |               |
  1 |               |               |               |
    +---------------+---------------+---------------+--------------------
            1               2               3               4               5
                                Probabilitas (Probability)

Keterangan:
- Merah (Kritis): RSK-01, RSK-02, RSK-03
- Oranye (Tinggi): RSK-04
- Kuning (Sedang): RSK-05, RSK-06
```

---

## 4. Evaluasi Kontrol Keamanan & Shared Responsibility Model
Berdasarkan **Cloud Shared Responsibility Model**:
- **Tanggung Jawab Cloud Provider (Oracle Cloud):** Keamanan fisik data center, server hardware, virtualisasi hypervisor, dan infrastruktur jaringan global.
- **Tanggung Jawab Pengguna (Mahasiswa/Administrator SI):** Keamanan sistem operasi (Ubuntu 22.04), firewall (UFW), akses kontrol (SSH Key & Fail2Ban), keamanan konfigurasi container (Docker), enkripsi data (TLS/SSL Let's Encrypt), keamanan kode aplikasi (Helmet.js & OWASP Top 10), serta manajemen pencadangan data (backup `pg_dump`).
