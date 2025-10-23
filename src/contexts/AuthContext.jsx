import { createContext, useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { apiService } from "../lib/api";

const AuthContext = createContext({});

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verificar si hay usuario logueado al cargar la aplicación
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = apiService.getStoredToken();
        if (token) {
          // Si tienes un endpoint /auth/me, descomenta esto:
          const userData = await apiService.getCurrentUser();
          // console.log("Usuario autenticado encontrado:", userData);
          setUser(userData);
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signUp = async (nombre, apellido, email, password) => {
    console.log("📝 Intentando registro con:", {
      nombre,
      apellido,
      email,
      password: password ? "***" : "vacío",
    });

    try {
      const data = await apiService.register(nombre, apellido, email, password);
      console.log("📦 Respuesta del registro:", data);

      if (data.token || data.user) {
        const userData = await apiService.getCurrentUser();
        // console.log("Usuario autenticado encontrado:", userData);
        setUser(userData);

        console.log("✅ Usuario registrado:", userData);
        return { data, error: null };
      }

      console.log("⚠️ Registro exitoso pero sin token/user en respuesta");
      return { data, error: null };
    } catch (error) {
      console.error("❌ Error en signUp:", error);
      return { data: null, error: { message: error.message } };
    }
  };

  const signIn = async (email, password) => {
    console.log("🔐 Intentando login con:", {
      email,
      password: password ? "***" : "vacío",
    });

    try {
      const data = await apiService.login(email, password);
      apiService.getCurrentUser(); // Actualizar info del usuario después del login
      console.log("📦 Respuesta del backend:", data);

      if (data.token || data.user) {
        const userData = await apiService.getCurrentUser();
        // console.log("Usuario autenticado encontrado:", userData);
        setUser(userData);
        console.log("✅ Usuario autenticado:", userData);
        return { data, error: null };
      }

      console.log("⚠️ Login exitoso pero sin token/user en respuesta");
      return { data, error: null };
    } catch (error) {
      console.error("❌ Error en signIn:", error);
      return { data: null, error: { message: error.message } };
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
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
