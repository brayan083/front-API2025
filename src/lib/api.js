// Configuración de la API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4002';

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Agregar token si existe
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Manejo específico de errores HTTP
        let errorMessage;
        switch (response.status) {
          case 400:
            errorMessage = errorData.message || 'Datos inválidos. Verifica la información ingresada.';
            break;
          case 401:
            errorMessage = errorData.message || 'Email o contraseña incorrectos.';
            break;
          case 403:
            errorMessage = errorData.message || 'Acceso denegado. Verifica tu backend y configuración CORS.';
            break;
          case 404:
            errorMessage = 'Endpoint no encontrado. Verifica la URL del backend.';
            break;
          case 500:
            errorMessage = 'Error interno del servidor. Contacta al administrador.';
            break;
          default:
            errorMessage = errorData.message || `Error ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      // Si es un error de red (CORS, conexión rechazada, etc.)
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('No se pudo conectar al servidor. Verifica que el backend Spring Boot esté funcionando en el puerto 4002.');
      }
      
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // Método para login
  async login(email, contrasena) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, contrasena }),
    });
    
    // Guardar token en localStorage si viene en la respuesta
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    
    return data;
  }

  // Método para registro
  async register(nombre, apellido, email, contrasena) {
    const data = await this.request('/api/auth/registrar', {
      method: 'POST',
      body: JSON.stringify({ nombre, apellido, email, contrasena }),
    });
    
    // Guardar token en localStorage si viene en la respuesta
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    
    return data;
  }

  // Método para logout (limpiar token)
  logout() {
    localStorage.removeItem('token');
  }

  // Método para verificar si hay token válido
  getStoredToken() {
    return localStorage.getItem('token');
  }

  // Método para obtener información del usuario (si tu backend lo soporta)
  async getCurrentUser() {
    const token = this.getStoredToken();
    if (!token) {
      return null;
    }

    try {
      // Si tienes un endpoint para obtener info del usuario actual
      const userData = await this.request('/api/auth/me', {
        method: 'GET',
      });
      return userData;
    } catch {
      // Si el token es inválido, limpiarlo
      this.logout();
      return null;
    }
  }
}

export const apiService = new ApiService();