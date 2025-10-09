// Configuración de la API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4002';

class ApiService {
  // Método para requests que requieren autenticación
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

    return this._makeRequest(url, config);
  }

  // Método para requests públicos (sin autenticación)
  async publicRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // NO añadir token para requests públicos
    return this._makeRequest(url, config);
  }

  // Método interno para hacer la request actual
  async _makeRequest(url, config) {

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

      // Verificar si la respuesta tiene contenido antes de hacer .json()
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        // Si no hay contenido JSON, verificar si hay texto
        const text = await response.text();
        return text || { success: true };
      }
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

  // ========== MÉTODOS PARA PRODUCTOS ==========
  
  // Obtener todos los productos con filtros opcionales
  async getProductos(filtros = {}) {
    const params = new URLSearchParams();
    
    // Usar los parámetros exactos que acepta tu backend
    if (filtros.q) params.append('q', String(filtros.q));
    if (filtros.categoria !== undefined && filtros.categoria !== null) {
      params.append('categoria', String(filtros.categoria));
    }
    if (filtros.marca !== undefined && filtros.marca !== null) {
      params.append('marca', String(filtros.marca));
    }
    if (filtros.min !== undefined) params.append('min', String(filtros.min));
    if (filtros.max !== undefined) params.append('max', String(filtros.max));
    if (filtros.page !== undefined) params.append('page', String(filtros.page));
    if (filtros.size !== undefined) params.append('size', String(filtros.size));
    if (filtros.sort) params.append('sort', String(filtros.sort));
    
    const queryString = params.toString();
    const endpoint = queryString ? `/api/productos?${queryString}` : '/api/productos';
    
    // Usar request público (sin autenticación)
    return await this.publicRequest(endpoint, {
      method: 'GET',
    });
  }

  // Obtener un producto específico por ID
  async getProducto(id) {
    return await this.publicRequest(`/api/productos/${id}`, {
      method: 'GET',
    });
  }

  // Obtener todas las categorías (público)
  async getCategorias() {
    return await this.publicRequest('/api/categorias', {
      method: 'GET',
    });
  }

  // Obtener todas las marcas (público)
  async getMarcas() {
    return await this.publicRequest('/api/marcas', {
      method: 'GET',
    });
  }

  // ========== MÉTODOS PARA CARRITO ==========
  
  // Obtener carrito del usuario
  async getCarrito() {
    return await this.request('/api/carrito', {
      method: 'GET',
    });
  }

  // Agregar producto al carrito
  async agregarAlCarrito(idProducto, cantidad = 1) {
    return await this.request('/api/carrito/items', {
      method: 'POST',
      body: JSON.stringify({
        id_producto: idProducto,
        cantidad: cantidad
      }),
    });
  }

  // Eliminar producto del carrito
  async eliminarDelCarrito(idProducto) {
    return await this.request(`/api/carrito/items/${idProducto}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();