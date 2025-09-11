import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const authTokens = localStorage.getItem('auth_tokens');
  if (authTokens) {
    const parsedTokens = JSON.parse(authTokens);
    const token = parsedTokens.access;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const getTasks = () => apiClient.get('/auth/tasks/');
export const getTask = (id: string) => apiClient.get(`/tasks/${id}/`);
export const createTask = (data: any) => apiClient.post('/tasks/', data);
export const updateTask = (id: string, data: any) => apiClient.patch(`/tasks/${id}/`, data);
export const deleteTask = (id: string) => apiClient.delete(`/tasks/${id}/`);

export const getTaskActivities = (taskId: string) => apiClient.get(`/tasks/${taskId}/activities/`);
export const addTaskActivity = (taskId: string, data: any) => apiClient.post(`/tasks/${taskId}/activities/add/`, data);

export const getTaskPayments = (taskId: string) => apiClient.get(`/tasks/${taskId}/payments/`);
export const addTaskPayment = (taskId: string, data: any) => apiClient.post(`/tasks/${taskId}/payments/add/`, data);