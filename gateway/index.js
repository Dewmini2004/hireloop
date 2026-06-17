const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: '*', credentials: true }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'Gateway OK', timestamp: new Date() }));

const services = {
  '/api/auth':           process.env.AUTH_SERVICE_URL   || 'http://auth-service:4001',
  '/api/jobs':           process.env.JOB_PARSER_URL     || 'http://job-parser-service:4002',
  '/api/interviews':     process.env.INTERVIEW_URL      || 'http://interview-service:4003',
  '/api/evaluations':    process.env.EVALUATION_URL     || 'http://evaluation-service:4004',
  '/api/progress':       process.env.PROGRESS_URL       || 'http://progress-service:4005',
  '/api/notifications':  process.env.NOTIFICATION_URL   || 'http://notification-service:4006',
};

Object.entries(services).forEach(([path, target]) => {
  app.use(path, createProxyMiddleware({
    target,
    changeOrigin: true,
    proxyTimeout: 30000,
    timeout: 30000,
    pathRewrite: { [`^${path}`]: '' },
    on: {
      error: (err, req, res) => {
        console.error(`[Gateway] Error on ${path}:`, err.message);
        if (!res.headersSent) {
          res.status(502).json({ error: 'Service unavailable', service: path });
        }
      }
    }
  }));
});

app.listen(PORT, () => console.log(`🚀 API Gateway running on port ${PORT}`));