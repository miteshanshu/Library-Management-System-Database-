import { create } from 'zustand';
import { authApi } from '../api/auth';

const useAuthStore = create((set, get) => ({
    // State
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    isAuthenticated: !!localStorage.getItem('token'),
    isLoading: false,
    error: null,

    // Actions
    login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
            const response = await authApi.login(email, password);
            const { token, user } = response.data;

            // Store in localStorage
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            set({
                user,
                token,
                isAuthenticated: true,
                isLoading: false,
                error: null,
            });

            return { success: true, user };
        } catch (error) {
            set({
                isLoading: false,
                error: error.message || 'Login failed',
            });
            return { success: false, error: error.message };
        }
    },

    register: async (full_name, email, password) => {
        set({ isLoading: true, error: null });
        try {
            const response = await authApi.register(full_name, email, password);
            const { token, user } = response.data;

            // Store in localStorage
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            set({
                user,
                token,
                isAuthenticated: true,
                isLoading: false,
                error: null,
            });

            return { success: true, user };
        } catch (error) {
            set({
                isLoading: false,
                error: error.message || 'Registration failed',
            });
            return { success: false, error: error.message };
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: null,
        });
    },

    checkAuth: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            set({ isAuthenticated: false, user: null });
            return false;
        }

        set({ isLoading: true });
        try {
            const response = await authApi.getMe();
            const user = response.data;

            localStorage.setItem('user', JSON.stringify(user));
            set({
                user,
                isAuthenticated: true,
                isLoading: false,
            });
            return true;
        } catch (error) {
            // Token invalid, clear auth
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            set({
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
            });
            return false;
        }
    },

    clearError: () => set({ error: null }),

    // Getters
    getRole: () => get().user?.role || null,
    isAdmin: () => get().user?.role === 'admin',
    isLibrarian: () => get().user?.role === 'librarian',
    isStudent: () => get().user?.role === 'student',
}));

export default useAuthStore;
