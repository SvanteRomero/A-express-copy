import axios from 'axios';
import { getApiUrl } from './config';
import { ExpenditureRequest, PaginatedResponse } from './api';
import { logout } from './auth';

export const apiClient = axios.create({
  baseURL: getApiUrl(''),
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

const refreshAuthLogic = async (failedRequest: any) => {
  const authTokens = localStorage.getItem('auth_tokens');
  if (authTokens) {
    const parsedTokens = JSON.parse(authTokens);
    const refreshToken = parsedTokens.refresh;
    if (refreshToken) {
      try {
        const response = await axios.post(getApiUrl('/token/refresh/'), {
          refresh: refreshToken,
        });
        const newAuthTokens = response.data;
        localStorage.setItem('auth_tokens', JSON.stringify(newAuthTokens));
        failedRequest.response.config.headers.Authorization = `Bearer ${newAuthTokens.access}`;
        return Promise.resolve();
      } catch (error) {
        logout();
        return Promise.reject(error);
      }
    }
  }
  logout();
  return Promise.reject(new Error('No refresh token found'));
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Fix: Check if error.response exists before accessing status
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await refreshAuthLogic(error);
        return apiClient(originalRequest);
      } catch (refreshError) {
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

export const login = async (username: any, password: any) => {
  const response = await apiClient.post('/login/', { username, password });
  localStorage.setItem('auth_tokens', JSON.stringify(response.data));
  return response;
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

export const getPaymentCategories = () => apiClient.get('/payment-categories/');
export const createPaymentCategory = (data: any) => apiClient.post('/payment-categories/', data);
export const updatePaymentCategory = (categoryId: number, data: any) => apiClient.patch(`/payment-categories/${categoryId}/`, data);
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

// Customer Stats & Acquisition
export const getCustomerStats = () => apiClient.get('/customers/stats/');
export const getCustomerMonthlyAcquisition = () => apiClient.get('/customers/monthly_acquisition/');

// Customers Search (with pagination)
export const searchCustomers = (params: { search?: string; page?: number }) => {
  const urlParams = new URLSearchParams();
  if (params.search) urlParams.set('search', params.search);
  if (params.page) urlParams.set('page', params.page.toString());
  return apiClient.get(`/customers/?${urlParams.toString()}`);
};

// Models Search
export const searchModels = (params: { search?: string }) => {
  const urlParams = new URLSearchParams();
  if (params.search) urlParams.set('search', params.search);
  return apiClient.get(`/models/?${urlParams.toString()}`);
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