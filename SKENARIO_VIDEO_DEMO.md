# Skenario & Panduan Video Demo (Durasi 5–7 Menit)
**Capstone Project Komputasi Awan — Universitas Tanjungpura**  
**Studi Kasus:** Klinik Pendaftaran Pasien Online  

---

## Checklist Sebelum Rekam Layar
- [ ] Buka Browser tab 1: Live Web API di VPS (`http://[IP-VPS]/api/queue`) — pastikan URL bar terlihat jelas!
- [ ] Buka Browser tab 2: Repository GitHub -> Tab **Actions** (tampilkan run pipeline terakhir warna hijau).
- [ ] Buka Browser tab 3: Dashboard Grafana (`http://[IP-VPS]:3001` atau port terkonfigurasi) menampilkan 4 panel metrik: CPU, RAM, Disk, Network.
- [ ] Buka Terminal SSH ke VPS: siap menjalankan perintah docker & status keamanan.

---

## Timeline & Skrip Narasi Video (5–7 Menit)

### Menit 00:00 – 01:00 | Pembukaan & Pengenalan Arsitektur
- **Aksi Layar:** Tampilkan slide judul / diagram arsitektur cloud.
- **Narasi:**
  > *"Halo semuanya dan selamat pagi/siang kepada Bapak Syahru Rahmayuda selaku dosen pengampu mata kuliah Komputasi Awan. Saya [Nama Mahasiswa], NIM [NIM], dari Program Studi Sistem Informasi Untan. Pada video ini, saya akan mendemonstrasikan Capstone Project saya yang berjudul 'Integrasi App, Database, CI/CD, Monitoring, Security, dan Load Balancing pada Infrastruktur Cloud Berbasis VPS' dengan studi kasus Klinik Pendaftaran Pasien Online."*
  > *"Sistem ini dibangun di atas IaaS Oracle Cloud Ubuntu 22.04 dengan arsitektur micro-services: reverse proxy Nginx Load Balancer, 2 worker application Node.js Express yang stateless, PostgreSQL 16 dengan volume persisten, CI/CD GitHub Actions, observabilitas Prometheus dan Grafana, serta pengerasan keamanan berlapis."*

---

### Menit 01:00 – 02:15 | Demonstrasi Aplikasi Live di VPS
- **Aksi Layar:** Pindah ke tab browser, tunjukkan URL bar publik VPS: `http://[IP-VPS]/api/queue`.
- **Narasi:**
  > *"Pertama, ini adalah aplikasi yang sudah berjalan live di VPS Oracle Cloud. Di URL bar terlihat IP publik VPS saya. Ketika saya refresh endpoint `/api/queue`, data antrean pasien tampil dalam format JSON beserta header `served_by` yang menunjukkan container mana yang memprosesnya."*
- **Aksi Layar:** Buka Terminal / Postman, lakukan request POST:
  ```bash
  curl -X POST http://[IP-VPS]/api/patients \
    -H "Content-Type: application/json" \
    -d '{"nik":"6171099999990001","name":"Pasien Uji Coba","phone":"081299887766","service_type":"Poli Gigi"}'
  ```
- **Narasi:**
  > *"Sekarang kita uji registrasi pasien baru via POST `/api/patients`. Data berhasil tersimpan secara transaksional ke PostgreSQL, dan nomor antrean baru otomatis digenerate."*

---

### Menit 02:15 – 03:45 | Bukti Distribusi 3 Load Balancer & Justifikasi
- **Aksi Layar:** Buka terminal VPS, jalankan:
  ```bash
  docker compose logs nginx --tail=20
  ```
- **Narasi:**
  > *"Komponen inti komputasi awan yang diuji adalah High Availability melalui Nginx Load Balancer. Saya telah menguji ketiga algoritma: Round Robin, Least Connection, dan IP Hash menggunakan Apache Benchmark dengan 1000 request."*
  > *"Pada Round Robin, request didistribusikan secara bergiliran 50:50. Pada pengujian IP Hash, request dari single client IP terkunci 100% pada satu server membuktikan sifat session persistence-nya."*
  > *"Namun, untuk studi kasus Klinik Pendaftaran Pasien Online ini, **saya memilih algoritma Least Connection**. Mengapa? Karena karakteristik beban kerja klinik sangat heterogen: polling antrean sangat cepat (~15ms), sementara pendaftaran pasien baru membutuhkan transaksi DB berat (~150ms). Dengan Least Connection, request baru otomatis diarahkan ke backend yang memiliki koneksi aktif paling sedikit, sehingga latensi rata-rata turun dari 42ms menjadi 37ms dan mencegah bottleneck."*

---

### Menit 03:45 – 04:45 | CI/CD GitHub Actions
- **Aksi Layar:** Pindah ke browser tab GitHub Actions.
- **Narasi:**
  > *"Selanjutnya adalah otomatisasi CI/CD. Setiap kali ada commit atau push ke branch `main`, GitHub Actions secara otomatis menjalankan pipeline: checkout kode, setup Node.js 20, menjalankan automated testing, dan melakukan automated deployment via SSH Action ke direktori `/var/www/capstone` di VPS. Terlihat di sini seluruh status pipeline berwarna hijau dan berhasil terdeploy."*

---

### Menit 04:45 – 05:45 | Monitoring Observability (Prometheus & Grafana)
- **Aksi Layar:** Buka tab Grafana Dashboard.
- **Narasi:**
  > *"Untuk observabilitas, saya mengintegrasikan Prometheus dan Node Exporter ke dashboard Grafana. Di sini kita dapat memonitor 4 metrik penting kesehatan sistem:*
  > *1. CPU Usage — fluktuasi saat load testing.*
  > *2. Memory / RAM Usage — memastikan tidak ada memory leak pada container.*
  > *3. Disk Usage — memantau pertumbuhan data PostgreSQL.*
  > *4. Network Traffic — memantau throughput request masuk dan keluar."*

---

### Menit 05:45 – 06:45 | Hardening Keamanan Server (Shared Responsibility Model)
- **Aksi Layar:** Buka terminal VPS, jalankan perintah:
  ```bash
  sudo ufw status verbose
  sudo fail2ban-client status
  ```
- **Narasi:**
  > *"Terakhir, pada lapisan keamanan, saya menerapkan Cloud Shared Responsibility Model:*
  > *1. Otentikasi SSH hanya menggunakan SSH Key (password login dinonaktifkan).*
  > *2. Firewall UFW hanya membuka port 22 untuk SSH, 80 untuk HTTP, dan 443 untuk HTTPS. Port database 5432 dan monitoring ditutup rapat dari internet publik dan hanya beroperasi di Docker internal network.*
  > *3. Fail2ban aktif melindungi port SSH dari serangan brute-force.*
  > *4. Pada aplikasi, terpasang Helmet.js untuk security headers serta parameterized queries untuk menangkal SQL Injection sesuai standar OWASP Top 10."*

---

### Menit 06:45 – 07:00 | Penutup
- **Narasi:**
  > *"Demikian demonstrasi Capstone Project Komputasi Awan untuk Sistem Klinik Pendaftaran Pasien Online. Seluruh 8 komponen wajib telah terintegrasi dan berfungsi dengan optimal. Terima kasih atas perhatiannya."*
