// Configuración de la API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4002';

class ApiService {
  // Método para requests que requieren autenticación
  request(endpoint, options = {}) {
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
  publicRequest(endpoint, options = {}) {
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
  _makeRequest(url, config) {
    return fetch(url, config)
      .then(response => {
        if (!response.ok) {
          return response.json()
            .catch(() => ({}))
            .then(errorData => {
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
                  errorMessage = errorData.message || 'Acceso denegado.';
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
            });
        }

        // Verificar si la respuesta tiene contenido antes de hacer .json()
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return response.json();
        } else {
          // Si no hay contenido JSON, verificar si hay texto
          return response.text().then(text => text || { success: true });
        }
      })
      .catch(error => {
        // Si es un error de red (CORS, conexión rechazada, etc.)
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          throw new Error('No se pudo conectar al servidor. Verifica que el backend Spring Boot esté funcionando en el puerto 4002.');
        }
        
        console.error('API Request Error:', error);
        throw error;
      });
  }

  // Método para login
  login(email, contrasena) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, contrasena }),
    }).then(data => {
      // Guardar token en localStorage si viene en la respuesta
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      return data;
    });
  }

  // Método para registro
  register(nombre, apellido, email, contrasena) {
    return this.request('/api/auth/registrar', {
      method: 'POST',
      body: JSON.stringify({ nombre, apellido, email, contrasena }),
    }).then(data => {
      // Guardar token en localStorage si viene en la respuesta
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      return data;
    });
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
  getCurrentUser() {
    const token = this.getStoredToken();
    if (!token) {
      return Promise.resolve(null);
    }

    // Si tienes un endpoint para obtener info del usuario actual
    return this.request('/api/auth/me', {
      method: 'GET',
    })
    .then(userData => {
      return userData;
    })
    .catch(() => {
      // Si el token es inválido, limpiarlo
      this.logout();
      return null;
    });
  }

  // ========== MÉTODOS PARA PRODUCTOS ==========
  
  // Obtener todos los productos con filtros opcionales
  getProductos(filtros = {}) {
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
    return this.publicRequest(endpoint, {
      method: 'GET',
    });
  }

  // Obtener un producto específico por ID
  getProducto(id) {
    return this.publicRequest(`/api/productos/${id}`, {
      method: 'GET',
    });
  }

  // Obtener todas las categorías (público)
  getCategorias() {
    return this.publicRequest('/api/categorias', {
      method: 'GET',
    });
  }

  // Obtener todas las marcas (público)
  getMarcas() {
    return this.publicRequest('/api/marcas', {
      method: 'GET',
    });
  }

  // ========== MÉTODOS PARA CARRITO ==========
  
  // Obtener carrito del usuario
  getCarrito() {
    return this.request('/api/carrito', {
      method: 'GET',
    });
  }

  // Agregar producto al carrito
  agregarAlCarrito(idProducto, cantidad = 1) {
    return this.request('/api/carrito/items', {
      method: 'POST',
      body: JSON.stringify({
        id_producto: idProducto,
        cantidad: cantidad
      }),
    });
  }

  // Eliminar producto del carrito
  eliminarDelCarrito(idProducto) {
    return this.request(`/api/carrito/items/${idProducto}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();