import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { apiService } from '../lib/api';

const AuthContext = createContext({});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuthStatus = useCallback(async () => {
        setLoading(true);
        try {
            const token = apiService.getStoredToken();
            if (token) {
                const profileData = await apiService.getCurrentUserProfile();
                if (profileData) {
                    setUser({
                        id: profileData.id,
                        email: profileData.email,
                        nombre: profileData.nombre,
                        apellido: profileData.apellido,
                        token: token
                    });
                } else {
                    setUser(null);
                    apiService.logout();
                }
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            setUser(null);
            apiService.logout();
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuthStatus();
    }, [checkAuthStatus]);

    const signUp = async (nombre, apellido, email, password) => {
        setLoading(true);
        try {
            const data = await apiService.register(nombre, apellido, email, password);
            if (data.token) {
                await checkAuthStatus();
                return { data: user, error: null };
            }
            return { data, error: null };
        } catch (error) {
            console.error('Error en signUp:', error);
            return { data: null, error: { message: error.message } };
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email, password) => {
        setLoading(true);
        try {
            await apiService.login(email, password);
            await checkAuthStatus();
            return { data: user, error: null };
        } catch (error) {
            console.error('Error en signIn:', error);
            return { data: null, error: { message: error.message } };
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        try {
            apiService.logout();
            setUser(null);
            return { error: null };
        } catch (error) {
            return { error: { message: error.message } };
        }
    };

    const value = {
        user,
        loading,
        signUp,
        signIn,
        signOut,
        checkAuthStatus
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
    children: PropTypes.node.isRequired,
};
