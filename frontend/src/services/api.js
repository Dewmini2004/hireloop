import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('hireloop_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Auth ─────────────────────────────────────────────────
export const authAPI = {
  register: (d) => api.post('/api/auth/register', d),
  login: (d) => api.post('/api/auth/login', d),
  logout: () => api.post('/api/auth/logout'),
  profile: () => api.get('/api/auth/profile'),

  // Admin
  adminStats: () => api.get('/api/auth/admin/stats'),
  adminUsers: (params) => api.get('/api/auth/admin/users', { params }),
  toggleUser: (id) => api.patch(`/api/auth/admin/users/${id}/toggle`),
  getCompanies: () => api.get('/api/auth/companies'),
  createCompany: (d) => api.post('/api/auth/companies', d),

  // Company/HR
  getCompanyStats: () => api.get('/api/auth/company/stats'),
  getCompanyCandidates: () => api.get('/api/auth/company/candidates'),
  inviteCandidate: (d) => api.post('/api/auth/company/invite', d),
}

// ─── Job Parser ───────────────────────────────────────────
export const jobAPI = {
  parse: (jd) => api.post('/api/jobs/parse', { job_description: jd }),
}

// ─── Interview ────────────────────────────────────────────
export const interviewAPI = {
  start: (d) => api.post('/api/interviews/start', d),
  answer: (d) => api.post('/api/interviews/answer', d),
  complete: (id) => api.post(`/api/interviews/complete/${id}`),
}

// ─── Progress ─────────────────────────────────────────────
export const progressAPI = {
  dashboard: (uid) => api.get(`/api/progress/dashboard/${uid}`),
  session: (sid) => api.get(`/api/progress/sessions/${sid}`),

  // Admin
  adminStats: () => api.get('/api/progress/admin/stats'),
  allSessions: (params) => api.get('/api/progress/admin/sessions', { params }),

  // Company
  companySessions: (companyId) => api.get(`/api/progress/company/${companyId}/sessions`),
}

export default api
