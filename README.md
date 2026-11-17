# Capstone Project: Integrasi App, Database, CI/CD, Monitoring, Security, dan Load Balancing pada Infrastruktur Cloud Berbasis VPS

**Studi Kasus:** Klinik Pendaftaran Pasien Online (Kasus No. 6)  
**Mata Kuliah:** Komputasi Awan (3 SKS) — Pertemuan 14 (UAS)  
**Program Studi:** Sistem Informasi, FMIPA Universitas Tanjungpura  
**Dosen Pengampu:** Syahru Rahmayuda, S.Kom., M.Kom.  

---

## 📋 Ringkasan Proyek
Proyek ini mengimplementasikan infrastruktur cloud terpadu di atas Virtual Private Server (VPS) Oracle Cloud Always Free (Ubuntu 22.04 LTS) yang mencakup 8 komponen wajib:
1. **VPS (IaaS)**: Ubuntu 22.04, 2 vCPU / 4 GB RAM.
2. **Database Cloud**: PostgreSQL 16 container terisolasi dengan persistensi volume `pgdata`.
3. **Application Tier**: Node.js 20 LTS + Express 4 stateless berjalan di 2 container (`app1` dan `app2`).
4. **Load Balancer**: Nginx reverse proxy dengan pengujian 3 algoritma (*Round Robin*, *Least Connection*, *IP Hash*).
5. **CI/CD Pipeline**: GitHub Actions otomatis build, test, dan deploy via SSH action ke VPS.
6. **Monitoring**: Prometheus + Node Exporter + Grafana (Dashboard 4 metrik: CPU, RAM, Disk, Network).
7. **Security Layer**: SSH Key-only, UFW Firewall (port 22, 80, 443), Fail2ban, TLS/SSL Let's Encrypt, Helmet.js, dan sanitasi input OWASP Top 10.
8. **Risk Register**: Analisis risiko keamanan cloud (`risk-register.md`) dengan kalkulasi skor Probabilitas × Dampak.

---

## 🛠️ Panduan Menjalankan Sistem (Deployment di VPS)

### 1. Prasyarat di VPS (Ubuntu 22.04)
```bash
# Update sistem dan install Docker
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-plugin git curl ufw fail2ban apache2-utils

# Tambahkan user ke group docker
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Pengaturan Firewall Khusus Oracle Cloud (PENTING)
Pada Oracle Cloud, selain UFW, aturan bawaan iptables dan Security List OCI wajib dibuka:
```bash
# Izinkan port pada iptables internal OCI Ubuntu
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3001 -j ACCEPT
sudo netfilter-persistent save

# Aktifkan UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```
*(Pastikan juga menambahkan Ingress Rules untuk TCP port 80 dan 443 di Oracle Cloud Console -> Virtual Cloud Network -> Security Lists)*.

### 3. Clone Repository & Jalankan Container
```bash
# Siapkan direktori kerja
sudo mkdir -p /var/www/capstone
sudo chown -R $USER:$USER /var/www/capstone
cd /var/www/capstone

# Clone repository
git clone https://github.com/[username]/capstone-app.git .

# Jalankan seluruh stack
docker compose up -d --build
```

---

## 🧪 Panduan Uji Beban 3 Algoritma Load Balancer

### A. Uji Round Robin (Default)
1. Pastikan baris direktif `least_conn;` dan `ip_hash;` pada `nginx.conf` di-comment.
2. Restart Nginx: `docker compose restart nginx`
3. Jalankan pengujian:
   ```bash
   ab -n 1000 -c 50 http://localhost/api/queue
   ```
4. Periksa log distribusi request:
   ```bash
   docker compose logs nginx --tail=30
   ```

### B. Uji Least Connection
1. Edit `nginx.conf`, aktifkan `least_conn;` di dalam blok `upstream app_backend`.
2. Restart Nginx: `docker compose restart nginx`
3. Jalankan pengujian campuran request read & write:
   ```bash
   ab -n 1000 -c 50 http://localhost/api/queue
   ```
4. Ambil log Nginx dan catat latensi serta utilisasi CPU dari Grafana.

### C. Uji IP Hash (Sticky Session)
1. Edit `nginx.conf`, matikan `least_conn;` dan aktifkan `ip_hash;`.
2. Restart Nginx: `docker compose restart nginx`
3. Jalankan pengujian:
   ```bash
   ab -n 1000 -c 50 http://localhost/api/queue
   ```
4. Verifikasi log Nginx membuktikan 100% request dialirkan ke satu container aplikasi saja secara konsisten.

---

## 📊 Endpoint API
- `GET /health` : Healthcheck server status
- `GET /api/queue` : Mengambil daftar antrean poliklinik aktif (joined with patients data)
- `POST /api/patients` : Mendaftarkan pasien baru & membuat nomor antrean otomatis
  - Payload:
    ```json
    {
      "nik": "6171012304900001",
      "name": "Budi Santoso",
      "phone": "081234567890",
      "address": "Jl. Ahmad Yani, Pontianak",
      "service_type": "Poli Umum"
    }
    ```
- `GET /api/patients` : Melihat seluruh master data pasien
- `GET /api/patients/:id` : Detail data pasien berdasarkan ID

---

## 📁 Struktur Dokumen
- `LAPORAN_CAPSTONE.md`: Draf lengkap laporan akhir PDF (Maksimal 15 Halaman, mencakup Bab 1 sampai Bab 8).
- `SKENARIO_VIDEO_DEMO.md`: Panduan runutan demonstrasi dan skrip narasi video 5–7 menit.
- `risk-register.md`: Dokumen formal analisis 6 risiko keamanan cloud dan matriks mitigasi.
