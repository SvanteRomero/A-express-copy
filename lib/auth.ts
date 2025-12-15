import axios from 'axios';
import { getApiUrl } from './config';

export const logout = async () => {
  try {
    // Call backend logout to clear HttpOnly cookies
    await axios.post(getApiUrl('/logout/'), {}, { withCredentials: true });
  } catch (error) {
    // Logout may fail if already logged out, but we still redirect
    console.error('Logout error:', error);
  }

  // Clear local storage
  localStorage.removeItem('auth_user');

  // Redirect to home page
  window.location.href = '/';
};
