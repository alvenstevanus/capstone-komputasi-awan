-- Schema PostgreSQL untuk Studi Kasus: Klinik Pendaftaran Pasien Online
-- Entitas: patients, queue

CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    nik VARCHAR(16) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS queue (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    queue_number VARCHAR(10) NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'WAITING',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Seed Data Awal untuk pengujian
INSERT INTO patients (nik, name, phone, address) VALUES
('6171012304900001', 'Ahmad Dani', '081234567890', 'Jl. Ahmad Yani, Pontianak'),
('6171021508950002', 'Siti Rahmawati', '082198765432', 'Jl. Gajah Mada, Pontianak'),
('6171032811880003', 'Budi Santoso', '085211223344', 'Jl. Sungai Raya Dalam, Kubu Raya')
ON CONFLICT (nik) DO NOTHING;

INSERT INTO queue (patient_id, queue_number, service_type, status) VALUES
(1, 'A-001', 'Poli Umum', 'WAITING'),
(2, 'B-001', 'Poli Gigi', 'WAITING'),
(3, 'A-002', 'Poli Umum', 'WAITING')
ON CONFLICT DO NOTHING;
