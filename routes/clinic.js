const router = require('express').Router();
const os = require('os');
const pool = require('../db');

// Middleware untuk mencatat container yang memproses request (observability)
router.use((req, res, next) => {
  res.setHeader('X-Served-By', os.hostname());
  next();
});

// 1. GET /api/queue - Mendapatkan daftar antrean pasien (Read)
router.get('/api/queue', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT q.id, q.queue_number, q.service_type, q.status, q.created_at,
              p.nik, p.name AS patient_name, p.phone
       FROM queue q
       JOIN patients p ON q.patient_id = p.id
       ORDER BY q.id ASC`
    );
    res.json({
      status: 'success',
      served_by: os.hostname(),
      total: rows.length,
      data: rows
    });
  } catch (err) {
    console.error('Error fetching queue:', err.message);
    res.status(500).json({ error: 'Database query error', message: err.message });
  }
});

// 2. POST /api/patients - Mendaftarkan pasien baru & membuat antrean otomatis (Write)
router.post('/api/patients', async (req, res) => {
  const { nik, name, phone, address, service_type } = req.body;

  // Validasi input dasar (OWASP Input Validation)
  if (!nik || !name || !phone) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Field nik, name, dan phone wajib diisi.'
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Simpan pasien baru (atau update jika sudah terdaftar)
    const patientInsertQuery = `
      INSERT INTO patients (nik, name, phone, address)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (nik) DO UPDATE 
      SET name = EXCLUDED.name, phone = EXCLUDED.phone, address = EXCLUDED.address
      RETURNING id, nik, name, phone;
    `;
    const patientResult = await client.query(patientInsertQuery, [
      nik,
      name,
      phone,
      address || null
    ]);
    const patient = patientResult.rows[0];

    // 2. Generate nomor antrean berikutnya
    const selectedService = service_type || 'Poli Umum';
    const prefix = selectedService.includes('Gigi') ? 'B' : (selectedService.includes('Anak') ? 'C' : 'A');
    
    const countResult = await client.query(
      'SELECT COUNT(*) FROM queue WHERE DATE(created_at) = CURRENT_DATE'
    );
    const nextNum = parseInt(countResult.rows[0].count, 10) + 1;
    const queueNumber = `${prefix}-${String(nextNum).padStart(3, '0')}`;

    // 3. Masukkan ke tabel queue
    const queueInsertQuery = `
      INSERT INTO queue (patient_id, queue_number, service_type, status)
      VALUES ($1, $2, $3, 'WAITING')
      RETURNING id, queue_number, service_type, status, created_at;
    `;
    const queueResult = await client.query(queueInsertQuery, [
      patient.id,
      queueNumber,
      selectedService
    ]);
    const queue = queueResult.rows[0];

    await client.query('COMMIT');

    res.status(201).json({
      status: 'success',
      message: 'Pendaftaran pasien dan nomor antrean berhasil dibuat.',
      served_by: os.hostname(),
      data: {
        patient,
        queue
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error registering patient:', err.message);
    res.status(500).json({ error: 'Transaction failed', message: err.message });
  } finally {
    client.release();
  }
});

// 3. GET /api/patients - Mendapatkan seluruh data pasien
router.get('/api/patients', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM patients ORDER BY id ASC');
    res.json({
      status: 'success',
      served_by: os.hostname(),
      total: rows.length,
      data: rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. GET /api/patients/:id - Mendapatkan detail pasien berdasarkan ID
router.get('/api/patients/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
    if (!rows[0]) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json({
      status: 'success',
      served_by: os.hostname(),
      data: rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
