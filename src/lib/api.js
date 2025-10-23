// Configuración de la API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4002';

class ApiService {
    request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        } else if (!url.includes('/api/auth/login') && !url.includes('/api/auth/registrar')) {
            console.warn(`Attempting authenticated request to ${endpoint} without a token.`);
        }

        return this._makeRequest(url, config);
    }

    publicRequest(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };
        return this._makeRequest(url, config);
    }

    async _makeRequest(url, config) {
        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                let errorData = {};
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData.message = response.statusText;
                }

                let errorMessage = `Error ${response.status}: ${errorData.message || response.statusText}`;

                if (response.status === 401) {
                    if (url.includes('/api/auth/login')) {
                        errorMessage = 'Email o contraseña incorrectos.';
                    } else {
                        errorMessage = errorData.message || 'No autorizado. Tu sesión puede haber expirado.';
                    }
                } else if (response.status === 403) {
                    errorMessage = errorData.message || 'Acceso denegado. No tienes permisos.';
                } else if (response.status === 400 && errorData.errors) {
                    errorMessage = `Error de validación: ${errorData.errors.join(', ')}`;
                } else if (response.status === 409 && errorData.message) {
                    errorMessage = errorData.message;
                }

                throw new Error(errorMessage);
            }

            const contentType = response.headers.get('content-type');
            if (response.status === 204 || !contentType) {
                return { success: true };
            }
            if (contentType && contentType.includes('application/json')) {
                return response.json();
            } else {
                return response.text().then(text => text || { success: true });
            }

        } catch (error) {
            if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('NetworkError'))) {
                throw new Error(`No se pudo conectar al servidor en ${API_BASE_URL}. Verifica que el backend esté funcionando.`);
            }
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // Métodos de Autenticación
    login(email, contrasena) {
        return this.publicRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, contrasena }),
        }).then(data => {
            if (data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('userEmail', data.email);
            }
            return data;
        });
    }

    register(nombre, apellido, email, contrasena) {
        return this.publicRequest('/api/auth/registrar', {
            method: 'POST',
            body: JSON.stringify({ nombre, apellido, email, contrasena }),
        }).then(data => {
            if (data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('userEmail', data.email);
            }
            return data;
        });
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
    }

    getStoredToken() {
        return localStorage.getItem('token');
    }

    getStoredEmail() {
        return localStorage.getItem('userEmail');
    }

    getCurrentUserProfile() {
        const token = this.getStoredToken();
        if (!token) {
            return Promise.resolve(null);
        }

        return this.request('/api/usuarios/perfil', {
            method: 'GET',
        })
            .then(profileData => {
                return { ...profileData, token };
            })
            .catch(error => {
                console.error("Error fetching user profile:", error);
                this.logout();
                return null;
            });
    }

    // Métodos de Productos
    getProductos(filtros = {}) {
        const params = new URLSearchParams();

        if (filtros.q) params.append('q', String(filtros.q));
        if (filtros.categoria !== undefined && filtros.categoria !== null && filtros.categoria !== '') {
            params.append('categoria', String(filtros.categoria));
        }
        if (filtros.marca !== undefined && filtros.marca !== null && filtros.marca !== '') {
            params.append('marca', String(filtros.marca));
        }
        if (filtros.min !== undefined) params.append('min', String(filtros.min));
        if (filtros.max !== undefined) params.append('max', String(filtros.max));
        if (filtros.page !== undefined) params.append('page', String(filtros.page));
        if (filtros.size !== undefined) params.append('size', String(filtros.size));
        if (filtros.sort) params.append('sort', String(filtros.sort));

        const queryString = params.toString();
        const endpoint = queryString ? `/api/productos?${queryString}` : '/api/productos';

        return this.publicRequest(endpoint, {
            method: 'GET',
        });
    }

    getProducto(id) {
        return this.publicRequest(`/api/productos/${id}`, {
            method: 'GET',
        });
    }

    getCategorias() {
        return this.publicRequest('/api/categorias', {
            method: 'GET',
        });
    }

    getMarcas() {
        return this.publicRequest('/api/marcas', {
            method: 'GET',
        });
    }

    // Métodos de Carrito
    getCarrito() {
        return this.request('/api/carrito', {
            method: 'GET',
        });
    }

    agregarAlCarrito(idProducto, cantidad = 1) {
        return this.request('/api/carrito/items', {
            method: 'POST',
            body: JSON.stringify({
                id_producto: idProducto,
                cantidad: cantidad
            }),
        });
    }

    eliminarDelCarrito(idProducto) {
        return this.request(`/api/carrito/items/${idProducto}`, {
            method: 'DELETE',
        });
    }

    // Métodos de Pedidos
    crearPedido(idDireccionEnvio, idMetodoPago) {
        return this.request('/api/pedidos', {
            method: 'POST',
            body: JSON.stringify({
                id_direccion_envio: idDireccionEnvio,
                id_metodo_pago: idMetodoPago
            }),
        });
    }

    getHistorialPedidos(pageable = { page: 0, size: 10, sort: 'fecha,desc' }) {
        const params = new URLSearchParams();
        params.append('page', pageable.page);
        params.append('size', pageable.size);
        params.append('sort', pageable.sort);
        return this.request(`/api/pedidos?${params.toString()}`, {
            method: 'GET',
        });
    }

    getDetallePedido(pedidoId) {
        return this.request(`/api/pedidos/${pedidoId}`, {
            method: 'GET',
        });
    }

    // Métodos de Perfil de Usuario
    updateProfile(profileData) {
        return this.request('/api/usuarios/perfil', {
            method: 'PUT',
            body: JSON.stringify(profileData),
        });
    }

    changePassword(contrasenaActual, contrasenaNueva) {
        return this.request('/api/usuarios/perfil/cambiar-contrasena', {
            method: 'PUT',
            body: JSON.stringify({ contrasenaActual, contrasenaNueva }),
        });
    }

    getDirecciones() {
        return this.request('/api/usuarios/direcciones', {
            method: 'GET',
        });
    }

    addDireccion(direccionData) {
        return this.request('/api/usuarios/direcciones', {
            method: 'POST',
            body: JSON.stringify(direccionData),
        });
    }

    getMetodosPago() {
        return this.request('/api/usuarios/metodos-pago', {
            method: 'GET',
        });
    }

    addMetodoPago(metodoPagoData) {
        return this.request('/api/usuarios/metodos-pago', {
            method: 'POST',
            body: JSON.stringify(metodoPagoData),
        });
    }
}

export const apiService = new ApiService();