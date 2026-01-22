import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage (Zustand persist)
    const authData = localStorage.getItem('penlet-auth');
    if (authData) {
      try {
        const { state } = JSON.parse(authData);
        if (state?.accessToken) {
          config.headers.Authorization = `Bearer ${state.accessToken}`;
        }
      } catch (e) {
        console.error('Error parsing auth data:', e);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const authData = localStorage.getItem('penlet-auth');
        if (authData) {
          const { state } = JSON.parse(authData);
          if (state?.refreshToken) {
            // Try to refresh token
            const response = await axios.post(
              `${api.defaults.baseURL}/auth/refresh`,
              { refresh_token: state.refreshToken }
            );
            
            const { access_token, refresh_token } = response.data;
            
            // Update stored tokens
            const newAuthData = {
              state: {
                ...state,
                accessToken: access_token,
                refreshToken: refresh_token,
              },
              version: 0,
            };
            localStorage.setItem('penlet-auth', JSON.stringify(newAuthData));
            
            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // Clear auth data on refresh failure
        localStorage.removeItem('penlet-auth');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// API methods for common operations
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refresh_token: refreshToken }),
  resetPasswordRequest: (email) => api.post('/auth/password-reset-request', { email }),
  verifyEmail: (token) => api.post('/auth/verify-email', null, { params: { token } }),
  resendVerification: (email) => api.post('/auth/resend-verification', null, { params: { email } }),
  forgotPassword: (email) => api.post('/auth/forgot-password', null, { params: { email } }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', null, { 
    params: { token, new_password: newPassword } 
  }),
};

export const usersAPI = {
  list: (params) => api.get('/users/', { params }),
  get: (id) => api.get(`/users/${id}`),
  update: (data) => api.put('/users/me', data),
  changePassword: (data) => api.post('/users/me/change-password', data),
  getStudentsByClass: (classLevel) => api.get(`/users/students/by-class/${classLevel}`),
  uploadProfilePicture: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/users/me/profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteProfilePicture: () => api.delete('/users/me/profile-picture'),
};

export const subjectsAPI = {
  list: (params) => api.get('/subjects/', { params }),
  get: (id) => api.get(`/subjects/${id}`),
  create: (data) => api.post('/subjects/', data),
  update: (id, data) => api.put(`/subjects/${id}`, data),
  delete: (id) => api.delete(`/subjects/${id}`),
  enroll: (id) => api.post(`/subjects/${id}/enroll`),
  mySubjects: () => api.get('/subjects/my/enrolled'),
};

export const contentAPI = {
  list: (params) => api.get('/content/', { params }),
  get: (id) => api.get(`/content/${id}`),
  createNote: (data) => api.post('/content/notes', data),
  createVideo: (data) => api.post('/content/videos', data),
  createAssignment: (data) => api.post('/content/assignments', data),
  update: (id, data) => api.put(`/content/${id}`, data),
  delete: (id) => api.delete(`/content/${id}`),
  approve: (id, data) => api.post(`/content/${id}/approve`, data),
  upcomingAssignments: () => api.get('/content/assignments/upcoming'),
};

export const submissionsAPI = {
  list: (params) => api.get('/submissions/', { params }),
  get: (id) => api.get(`/submissions/${id}`),
  create: (data) => api.post('/submissions/', data),
  submit: (data) => api.post('/submissions/', data),
  mySubmissions: () => api.get('/submissions/my'),
  update: (id, data) => api.put(`/submissions/${id}`, data),
  grade: (id, data) => api.post(`/submissions/${id}/grade`, data),
  stats: (assignmentId) => api.get(`/submissions/assignment/${assignmentId}/stats`),
};

export const flashcardsAPI = {
  list: (params) => api.get('/flashcards/', { params }),
  get: (id) => api.get(`/flashcards/${id}`),
  create: (data) => api.post('/flashcards/', data),
  update: (id, data) => api.put(`/flashcards/${id}`, data),
  delete: (id) => api.delete(`/flashcards/${id}`),
  review: (id, data) => api.post(`/flashcards/${id}/review`, data),
  studySession: (params) => api.get('/flashcards/study/session', { params }),
};

export const timetableAPI = {
  list: (params) => api.get('/timetable/', { params }),
  get: (id) => api.get(`/timetable/${id}`),
  create: (data) => api.post('/timetable/', data),
  update: (id, data) => api.put(`/timetable/${id}`, data),
  delete: (id) => api.delete(`/timetable/${id}`),
  weekSchedule: () => api.get('/timetable/week/current'),
};

export const alarmsAPI = {
  list: (params) => api.get('/alarms/', { params }),
  get: (id) => api.get(`/alarms/${id}`),
  create: (data) => api.post('/alarms/', data),
  update: (id, data) => api.put(`/alarms/${id}`, data),
  delete: (id) => api.delete(`/alarms/${id}`),
  snooze: (id, minutes) => api.post(`/alarms/${id}/snooze`, { snooze_minutes: minutes }),
  dismiss: (id) => api.post(`/alarms/${id}/dismiss`),
  todayAlarms: () => api.get('/alarms/upcoming/today'),
};

export const gamesAPI = {
  available: () => api.get('/games/available'),
  recordScore: (data) => api.post('/games/scores', data),
  myScores: (params) => api.get('/games/scores', { params }),
  bestScores: () => api.get('/games/scores/best'),
  leaderboard: (gameType, params) => api.get(`/games/leaderboard/${gameType}`, { params }),
  stats: () => api.get('/games/stats/summary'),
};

export const notificationsAPI = {
  list: (params) => api.get('/notifications/', { params }),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/mark-all-read'),
  delete: (id) => api.delete(`/notifications/${id}`),
  clearAll: () => api.delete('/notifications/clear-all'),
};

export const analyticsAPI = {
  student: () => api.get('/analytics/student'),
  teacher: () => api.get('/analytics/teacher'),
  admin: () => api.get('/analytics/admin'),
  classPerformance: (classLevel) => api.get(`/analytics/class/${classLevel}/performance`),
  leaderboard: (params) => api.get('/analytics/leaderboard/students', { params }),
};

export const chatAPI = {
  send: (data) => api.post('/chat/chat', data),
  stream: (data) => api.post('/chat/chat/stream', data),
  getSubjects: () => api.get('/chat/subjects'),
};

export const filesAPI = {
  uploadNote: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/files/upload/note', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadVideo: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/files/upload/video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadSubmission: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/files/upload/submission', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadProfilePicture: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/files/upload/profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadThumbnail: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/files/upload/thumbnail', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  delete: (fileType, filename) => api.delete(`/files/delete/${fileType}/${filename}`),
};

export const adminAPI = {
  createTeacher: (data) => api.post('/admin/users/teacher', data),
  getUserDetails: (userId) => api.get(`/admin/users/${userId}/details`),
  updateUser: (userId, data) => api.put(`/admin/users/${userId}`, data),
  assignSubject: (userId, subjectId) => api.post(`/admin/users/${userId}/assign-subject/${subjectId}`),
  removeSubject: (userId, subjectId) => api.delete(`/admin/users/${userId}/remove-subject/${subjectId}`),
  pendingContent: () => api.get('/admin/content/pending'),
  auditLogs: (params) => api.get('/admin/audit-logs', { params }),
  overview: () => api.get('/admin/stats/overview'),
  toggleUserActive: (userId) => api.post(`/admin/users/${userId}/toggle-active`),
};

export default api;