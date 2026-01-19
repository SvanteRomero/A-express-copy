import axios from 'axios';
import { getApiUrl } from './config';
import { PaginatedResponse } from './api';
import { ExpenditureRequest, PaymentCategory } from '@/components/tasks/types';

// CSRF token storage (not HttpOnly, can be read by JS)
let csrfToken: string | null = null;

export const apiClient = axios.create({
  baseURL: getApiUrl(''),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with every request
});

// Function to get CSRF token from backend
export const fetchCsrfToken = async () => {
  try {
    const response = await axios.get(getApiUrl('/csrf/'), {
      withCredentials: true
    });
    csrfToken = response.data.csrfToken;
    return csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    return null;
  }
};

// Request interceptor: Add CSRF token to mutating requests
apiClient.interceptors.request.use(async (config) => {
  // For POST, PUT, PATCH, DELETE requests, add CSRF token
  if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
    if (!csrfToken) {
      await fetchCsrfToken();
    }
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
  }
  return config;
});

// Response interceptor: Handle 401 errors by attempting token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || '';

    // Auth-related endpoints that should NOT trigger logout on failure
    const authEndpoints = ['/auth/me/', '/auth/refresh/', '/login/', '/logout/', '/csrf/'];
    const isAuthEndpoint = authEndpoints.some(endpoint => requestUrl.includes(endpoint));

    // If 401 and not already retried, try to refresh the token
    // But skip refresh attempt for auth endpoints to avoid loops
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        // Call cookie-based refresh endpoint
        await axios.post(getApiUrl('/auth/refresh/'), {}, {
          withCredentials: true
        });

        // Retry the original request (cookies will be updated)
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        // Refresh failed, logout user via event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const getProfile = () => apiClient.get('/users/profile/');
export const getTasks = (params: any = {}) => apiClient.get('/tasks/', { params });
export const getDebts = (params: any = {}) => apiClient.get('/tasks/debts/', { params });
export const getFrontDeskPerformance = (params: any = {}) => apiClient.get('/reports/front-desk-performance/', { params });
export const getTask = (id: string) => apiClient.get(`/tasks/${id}/`);
export const createTask = (data: any) => apiClient.post('/tasks/', data);
export const updateTask = (id: string, data: any) => apiClient.patch(`/tasks/${id}/`, data);
export const deleteTask = (id: string) => apiClient.delete(`/tasks/${id}/`);
export const createCustomer = (data: any) => apiClient.post('/customers/create/', data);
export const getCustomers = () => apiClient.get('/customers/');
export const getCustomer = (customerId: number) => apiClient.get(`/customers/${customerId}/`);
export const updateCustomer = (customerId: number, data: any) => apiClient.patch(`/customers/${customerId}/`, data);
export const deleteCustomer = (customerId: number) => apiClient.delete(`/customers/${customerId}/`);

export const getReferrers = () => apiClient.get('/referrers/');
export const createReferrer = (data: any) => apiClient.post('/referrers/', data);
export const updateReferrer = (referrerId: number, data: any) => apiClient.patch(`/referrers/${referrerId}/`, data);
export const deleteReferrer = (referrerId: number) => apiClient.delete(`/referrers/${referrerId}/`);

export const getTaskActivities = (taskId: string) => apiClient.get(`/tasks/${taskId}/activities/`);
export const addTaskActivity = (taskId: string, data: any) => apiClient.post(`/tasks/${taskId}/add-activity/`, data);

export const getTaskPayments = (taskId: string) => apiClient.get(`/tasks/${taskId}/payments/`);
export const addTaskPayment = (taskId: string, data: any) => apiClient.post(`/tasks/${taskId}/add-payment/`, data);

export const listTechnicians = () => apiClient.get('list/technicians/');
export const getLocations = () => apiClient.get('/locations/');
export const addLocation = (locationData: { name: string; }) => apiClient.post('/locations/', locationData);
export const updateLocation = (locationId: number, locationData: { name: string; }) => apiClient.patch(`/locations/${locationId}/`, locationData);
export const deleteLocation = (locationId: number) => apiClient.delete(`/locations/${locationId}/`);
export const listWorkshopLocations = () => apiClient.get('locations/workshop-locations/');
export const listWorkshopTechnicians = () => apiClient.get('list/workshop-technicians/');
export const listAssignableUsers = () => apiClient.get('list/assignable-users/');

export const login = async (username: any, password: any) => {
  // Tokens are now set as HttpOnly cookies by the server
  // No need to store them in localStorage
  return await apiClient.post('/login/', { username, password });
};

// Check if user is authenticated using cookie auth
export const checkAuth = async () => {
  try {
    const response = await apiClient.get('/auth/me/');
    return response.data;
  } catch (error) {
    return null;
  }
};
export const registerUser = (userData: any) => apiClient.post('/users/', userData);
export const listUsers = () => apiClient.get('/users/');
export const updateProfile = (profileData: any) => apiClient.patch('/users/profile/update/', profileData);
export const changePassword = (passwordData: any) => apiClient.post('/users/profile/change-password/', passwordData);
export const uploadProfilePicture = (formData: any) => apiClient.post('/profile/upload-picture/', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});
export const getSessions = () => apiClient.get('/users/profile/sessions/');
export const revokeSession = (sessionId: string) => apiClient.post(`/users/profile/sessions/${sessionId}/revoke/`);
export const revokeAllSessions = () => apiClient.post('/users/profile/sessions/revoke-all/');
export const getAuditLogs = (params: any = {}) => apiClient.get('/users/audit/logs/', { params });
export const getProfileActivity = (params: any = {}) => apiClient.get('/users/profile/activity/', { params });
export const getUserDetail = (userId: any) => apiClient.get(`/users/${userId}/`);
export const updateUser = (userId: any, userData: any) => apiClient.patch(`/users/${userId}/update/`, userData);
export const deleteUser = (userId: any) => apiClient.delete(`/users/${userId}/delete/`);
export const deactivateUser = (userId: any) => apiClient.post(`/users/${userId}/deactivate/`);
export const activateUser = (userId: any) => apiClient.post(`/users/${userId}/activate/`);
export const listUsersByRole = (role: string) => apiClient.get(`/users/role/${role}/`);
export const getCostBreakdowns = (taskId: any) => apiClient.get(`/tasks/${taskId}/cost-breakdowns/`);
export const createCostBreakdown = (taskId: string, costBreakdownData: any) => apiClient.post(`/tasks/${taskId}/cost-breakdowns/`, costBreakdownData);
export const updateCostBreakdown = (taskId: any, costBreakdownId: any, costBreakdownData: any) => apiClient.patch(`/tasks/${taskId}/cost-breakdowns/${costBreakdownId}/`, costBreakdownData);
export const deleteCostBreakdown = (taskId: string, costBreakdownId: number) => apiClient.delete(`/tasks/${taskId}/cost-breakdowns/${costBreakdownId}/`);

export const getBrands = () => apiClient.get('/brands/');
export const createBrand = (brandData: { name: string; }) => apiClient.post('/brands/', brandData);
export const updateBrand = (brandId: number, brandData: { name: string; }) => apiClient.patch(`/brands/${brandId}/`, brandData);
export const deleteBrand = (brandId: number) => apiClient.delete(`/brands/${brandId}/`);

export const getPaymentMethods = () => apiClient.get('/payment-methods/');
export const createPaymentMethod = (paymentMethodData: { name: string; }) => apiClient.post('/payment-methods/', paymentMethodData);
export const updatePaymentMethod = (paymentMethodId: number, paymentMethodData: { name: string; }) => apiClient.patch(`/payment-methods/${paymentMethodId}/`, paymentMethodData);
export const deletePaymentMethod = (paymentMethodId: number) => apiClient.delete(`/payment-methods/${paymentMethodId}/`);

export const getAccounts = () => apiClient.get('/accounts/');
export const createAccount = (accountData: { name: string; balance: number; }) => apiClient.post('/accounts/', accountData);
export const updateAccount = (accountId: number, accountData: { name: string; }) => apiClient.patch(`/accounts/${accountId}/`, accountData);
export const deleteAccount = (accountId: number) => apiClient.delete(`/accounts/${accountId}/`);

export const getPaymentCategories = () => apiClient.get<PaymentCategory[]>('/payment-categories/');
export const createPaymentCategory = (data: { name: string }) => apiClient.post<PaymentCategory>('/payment-categories/', data);
export const updatePaymentCategory = (categoryId: number, data: { name: string }) => apiClient.patch<PaymentCategory>(`/payment-categories/${categoryId}/`, data);
export const deletePaymentCategory = (categoryId: number) => apiClient.delete(`/payment-categories/${categoryId}/`);

// Expenditure Requests
export const getExpenditureRequests = async (params: { page?: number; page_size?: number;[key: string]: any } = {}): Promise<PaginatedResponse<ExpenditureRequest>> => {
  const response = await apiClient.get('/expenditure-requests/', { params });
  return response.data;
};
export const createExpenditureRequest = (data: any) => apiClient.post('/expenditure-requests/', data);
export const createAndApproveExpenditureRequest = (data: any) => apiClient.post('/expenditure-requests/create_and_approve/', data);
export const approveExpenditureRequest = (id: number) => apiClient.post(`/expenditure-requests/${id}/approve/`);
export const rejectExpenditureRequest = (id: number) => apiClient.post(`/expenditure-requests/${id}/reject/`);
export const deleteExpenditureRequest = (id: number) => apiClient.delete(`/expenditure-requests/${id}/`);

// Customer Stats & Acquisition
export const getCustomerStats = () => apiClient.get('/customers/stats/');
export const getCustomerMonthlyAcquisition = () => apiClient.get('/customers/monthly_acquisition/');

export const searchCustomers = (params: { search?: string; page?: number }) => {
  const urlParams = new URLSearchParams();
  if (params.search) urlParams.set('search', params.search);
  if (params.page) urlParams.set('page', params.page.toString());
  return apiClient.get(`/customers/?${urlParams.toString()}`);
};

// Get customers for messaging compose view (grouped with their filtered tasks)
export const getCustomersForMessaging = (params: { template_filter?: string; search?: string; page?: number }) => {
  const urlParams = new URLSearchParams();
  urlParams.set('page_size', '10'); // 10 customers per page
  if (params.template_filter) urlParams.set('template_filter', params.template_filter);
  if (params.search) urlParams.set('search', params.search);
  if (params.page) urlParams.set('page', params.page.toString());
  return apiClient.get(`/customers/for_messaging/?${urlParams.toString()}`).then(res => res.data);
};

// Models Search
export const searchModels = (params: { search?: string; brand?: string }) => {
  const urlParams = new URLSearchParams();
  if (params.search) urlParams.set('search', params.search);
  if (params.brand) urlParams.set('brand', params.brand);
  return apiClient.get(`/models/?${urlParams.toString()}`);
};

// Tasks Search (for dropdowns - capped at 4 results)
export const searchTasks = (params: { search?: string; page_size?: number }) => {
  const urlParams = new URLSearchParams();
  urlParams.set('page_size', (params.page_size || 4).toString());
  if (params.search) urlParams.set('search', params.search);
  return apiClient.get(`/tasks/?${urlParams.toString()}`);
};

// Payment Methods (with pagination handling)
export const fetchPaymentMethods = async () => {
  const response = await apiClient.get('/payment-methods/');
  const data = response.data;
  if (data && Array.isArray(data.results)) {
    return data.results;
  }
  return data;
};

// Referrers Search
export const searchReferrers = (query: string) => apiClient.get(`/referrers/search/?query=${query}`);

// Messaging - Send SMS to customers
export const sendCustomerSMS = (taskId: string, data: { phone_number: string; message: string }) =>
  apiClient.post(`/messaging/tasks/${taskId}/send-sms/`, data).then(res => res.data);

export const getMessageTemplates = () => apiClient.get('/messaging/templates/').then(res => res.data);
export const createMessageTemplate = (data: any) => apiClient.post('/messaging/templates/', data).then(res => res.data);
export const updateMessageTemplate = (id: number, data: any) => apiClient.put(`/messaging/templates/${id}/`, data).then(res => res.data);
export const deleteMessageTemplate = (id: number) => apiClient.delete(`/messaging/templates/${id}/`);
export const sendBulkSMS = (data: any) => apiClient.post('/messaging/bulk-send/', data).then(res => res.data);
export const sendDebtReminder = (taskId: number, phoneNumber?: string) =>
  apiClient.post(`/messaging/tasks/${taskId}/send-debt-reminder/`, phoneNumber ? { phone_number: phoneNumber } : {}).then(res => res.data);
export const previewTemplateMessage = (taskId: string, templateKey: string) =>
  apiClient.post(`/messaging/tasks/${taskId}/preview-message/`, { template_key: templateKey }).then(res => res.data);
export const getMessageHistory = (params: { page?: number; search?: string } = {}) =>
  apiClient.get('/messaging/history/', { params }).then(res => res.data);
// Dashboard Stats
export const getDashboardStats = () => apiClient.get('/dashboard-stats/').then(res => res.data);
export const getTechnicianDashboardStats = () => apiClient.get('/technician-dashboard-stats/').then(res => res.data);
export const getAccountantDashboardStats = () => apiClient.get('/accountant-dashboard-stats/').then(res => res.data);

// System Settings
export interface SystemSettings {
  company_name: string;
  company_phone_numbers: string[];
  auto_sms_on_task_creation: boolean;
  auto_pickup_reminders_enabled: boolean;
  pickup_reminder_hours: number;
  auto_debt_reminders_enabled: boolean;
  debt_reminder_hours: number;
  debt_reminder_max_days: number;
  updated_at: string;
}
export const getSystemSettings = () => apiClient.get<SystemSettings>('/system-settings/').then(res => res.data);
export const updateSystemSettings = (data: Partial<SystemSettings>) => apiClient.patch<SystemSettings>('/system-settings/', data).then(res => res.data);

// Scheduler Notifications (for polling)
export interface SchedulerNotification {
  id: number;
  job_type: 'pickup_reminder' | 'debt_reminder';
  tasks_found: number;
  messages_sent: number;
  messages_failed: number;
  failure_details: Array<{ task_id: string; task_title: string; error: string }>;
  created_at: string;
}
export const getSchedulerNotifications = () =>
  apiClient.get<SchedulerNotification[]>('/messaging/scheduler-notifications/').then(res => res.data);
export const acknowledgeSchedulerNotification = (id: number) =>
  apiClient.post(`/messaging/scheduler-notifications/${id}/acknowledge/`);
