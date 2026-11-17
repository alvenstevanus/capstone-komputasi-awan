const express = require('express');
const helmet = require('helmet');
require('dotenv').config();

const app = express();

// Security headers (OWASP Top 10 Security Misconfiguration mitigation)
app.use(helmet());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck endpoint (wajib untuk Docker/Load Balancer)
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Route spesifik studi kasus: Klinik Pendaftaran Pasien Online
app.use(require('./routes/clinic'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`App on port ${PORT}`));
