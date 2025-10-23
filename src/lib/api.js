// Configuración de la API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4002';

class ApiService {
    // Método interno para hacer la request actual
    async _makeRequest(url, config, isPublic = false) {
        let response;
        try {
            response = await fetch(url, config);

            if (!response.ok) {
                // Intentar obtener el cuerpo del error como JSON
                const errorData = await response.json().catch(() => ({}));
                let errorMessage;

                // Mapeo de códigos de estado a mensajes más amigables
                switch (response.status) {
                    case 400: // Bad Request
                        errorMessage = errorData.message || 'Datos inválidos. Por favor, verifica la información ingresada.';
                        break;
                    case 401: // Unauthorized
                        errorMessage = errorData.message || 'Credenciales incorrectas o token inválido/expirado.';
                        // Si el error es 401 y no es una petición pública, desloguear
                        if (!isPublic) {
                            this.logout();
                            // Opcional: Recargar la página para forzar a la pantalla de login
                            // window.location.reload();
                        }
                        break;
                    case 403: // Forbidden
                        errorMessage = errorData.message || 'Acceso denegado. No tienes permisos para esta acción.';
                        break;
                    case 404: // Not Found
                        errorMessage = errorData.message || 'Recurso no encontrado en el servidor.';
                        break;
                    case 409: // Conflict
                        errorMessage = errorData.message || 'Conflicto. El recurso ya existe o hay un problema de duplicidad.';
                        break;
                    case 500: // Internal Server Error
                        errorMessage = errorData.message || 'Ocurrió un error interno inesperado en el servidor.';
                        break;
                    default:
                        errorMessage = errorData.message || `Error ${response.status}: ${response.statusText}`;
                }
                // Lanzar el error formateado
                throw new Error(`Error ${response.status}: ${errorMessage}`);
            }

            // Procesar respuesta exitosa
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                // Para respuestas sin cuerpo (ej: 204 No Content) o no JSON
                const text = await response.text();
                // Devolver un objeto indicando éxito si no hay texto, o el texto si lo hay
                return text ? text : { success: true };
            }

        } catch (error) {
            // Si ya es un error formateado por nosotros, re-lanzarlo
            if (error.message.startsWith('Error ')) {
                throw error;
            }
            // Si es un error de red (TypeError: Failed to fetch)
            if (error instanceof TypeError && error.message.includes('fetch')) {
                console.error('Network Error:', error);
                throw new Error(`Error de Red: No se pudo conectar al servidor en ${API_BASE_URL}. Verifica que el backend esté funcionando y accesible.`);
            }

            // Otros errores inesperados
            console.error('API Request Error (catch general):', error);
            // Re-lanzar el error original o uno nuevo genérico
            throw error || new Error('Ocurrió un error inesperado al procesar la solicitud.');
        }
    }


    // Método para requests que requieren autenticación
    request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const token = this.getStoredToken();

        // No hacer la petición si no hay token (excepto para login/registro que usan publicRequest)
        // if (!token && !isPublicEndpoint(endpoint)) {
        //   console.warn(`Intento de request autenticada sin token a ${endpoint}`);
        //   // Podrías devolver un error aquí o dejar que falle en el backend
        //   // return Promise.reject(new Error('No autenticado'));
        // }

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
                ...(token ? { Authorization: `Bearer ${token}` } : {}), // Añadir token si existe
            },
            ...options,
        };

        return this._makeRequest(url, config, false); // false indica que no es pública
    }

    // Método para requests públicos (sin autenticación explícita)
    publicRequest(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        return this._makeRequest(url, config, true);
    }


    // --- AUTENTICACIÓN ---

    login(email, contrasena) {
        // Login siempre es público
        return this.publicRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, contrasena }),
        }).then(data => {
            if (data.token) {
                localStorage.setItem('token', data.token);
                // Guardar email también puede ser útil
                if (email) localStorage.setItem('userEmail', email);
            }
            return data; // Devuelve { usuarioId, email, token }
        });
    }

    register(nombre, apellido, email, contrasena) {
        // Registro siempre es público
        return this.publicRequest('/api/auth/registrar', {
            method: 'POST',
            body: JSON.stringify({ nombre, apellido, email, contrasena }),
        }).then(data => {
            // Si el registro devuelve token (auto-login)
            if (data.token) {
                localStorage.setItem('token', data.token);
                if (email) localStorage.setItem('userEmail', email);
            }
            return data; // Devuelve { usuarioId, email, token } o solo mensaje
        });
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail'); // Limpiar también el email
    }

    getStoredToken() {
        return localStorage.getItem('token');
    }

    getStoredEmail() {
        return localStorage.getItem('userEmail');
    }

    // Obtener perfil del usuario autenticado
    getCurrentUserProfile() {
        const token = this.getStoredToken();
        if (!token) {
            return Promise.resolve(null); // No hay token, no hay usuario
        }
        // Usar 'request' (autenticado)
        return this.request('/api/usuarios/perfil', {
            method: 'GET',
        })
            .then(profileData => {
                // Combinar datos del perfil con el token existente
                return { ...profileData, token }; // Devuelve { id, email, nombre, apellido, token }
            })
            .catch(error => {
                console.error('Error fetching user profile:', error);
                // Si falla (ej: token inválido/expirado), desloguear y devolver null
                if (error.message.includes('401')) {
                    this.logout();
                }
                return null;
            });
    }

    // --- PRODUCTOS, CATEGORÍAS, MARCAS (Públicos) ---

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
        return this.publicRequest(endpoint, { method: 'GET' });
    }

    getProducto(id) {
        return this.publicRequest(`/api/productos/${id}`, { method: 'GET' });
    }

    getCategorias() {
        return this.publicRequest('/api/categorias', { method: 'GET' });
    }

    getMarcas() {
        return this.publicRequest('/api/marcas', { method: 'GET' });
    }

    // --- CARRITO (Autenticado) ---

    getCarrito() {
        return this.request('/api/carrito', { method: 'GET' });
    }

    agregarAlCarrito(idProducto, cantidad = 1) {
        return this.request('/api/carrito/items', {
            method: 'POST',
            body: JSON.stringify({ id_producto: idProducto, cantidad: cantidad }),
        });
    }

    eliminarDelCarrito(idProducto) {
        return this.request(`/api/carrito/items/${idProducto}`, { method: 'DELETE' });
    }

    // --- MÉTODOS PARA CHECKOUT (Autenticado) ---

    /**
     * Obtiene las direcciones de envío del usuario logueado.
     * @returns {Promise<Array<object>>} Una promesa que resuelve a un array de direcciones.
     */
    getDirecciones() {
        return this.request('/api/usuarios/direcciones', { method: 'GET' });
    }

    /**
     * Obtiene los métodos de pago del usuario logueado.
     * @returns {Promise<Array<object>>} Una promesa que resuelve a un array de métodos de pago.
     */
    getMetodosPago() {
        return this.request('/api/usuarios/metodos-pago', { method: 'GET' });
    }

    /**
     * Crea un nuevo pedido utilizando una dirección y método de pago específicos.
     * @param {number} idDireccionEnvio - El ID de la dirección de envío a usar.
     * @param {number} idMetodoPago - El ID del método de pago a usar.
     * @returns {Promise<object>} Una promesa que resuelve al objeto del pedido creado.
     */
    crearPedido(idDireccionEnvio, idMetodoPago) {
        return this.request('/api/pedidos', {
            method: 'POST',
            body: JSON.stringify({
                id_direccion_envio: idDireccionEnvio,
                id_metodo_pago: idMetodoPago
            }),
        });
    }
}

export const apiService = new ApiService();