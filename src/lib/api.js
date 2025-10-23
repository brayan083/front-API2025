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
                        // Si hay 'errors' (de validación), usarlos. Si no, usar 'message'.
                        errorMessage = errorData.errors ? errorData.errors.join(', ') : (errorData.message || 'Datos inválidos. Verifica la información ingresada.');
                        break;
                    case 401: // Unauthorized
                        errorMessage = errorData.message || 'Credenciales incorrectas o token inválido/expirado.';
                        if (!isPublic) {
                            this.logout();
                            // Forzar recarga para ir a login si el token falla
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
                throw new Error(`Error ${response.status}: ${errorMessage}`);
            }

            // Procesar respuesta exitosa
            const contentType = response.headers.get('content-type');
            if (response.status === 204) { // No Content
                return { success: true }; // Devolver éxito si no hay cuerpo
            }
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                const text = await response.text();
                return text ? text : { success: true };
            }

        } catch (error) {
            if (error.message.startsWith('Error ')) {
                throw error;
            }
            if (error instanceof TypeError && error.message.includes('fetch')) {
                console.error('Network Error:', error);
                throw new Error(`Error de Red: No se pudo conectar al servidor en ${API_BASE_URL}. Verifica que el backend esté funcionando y accesible.`);
            }
            console.error('API Request Error (catch general):', error);
            throw error || new Error('Ocurrió un error inesperado al procesar la solicitud.');
        }
    }

    // Método para requests que requieren autenticación
    request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const token = this.getStoredToken();
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            ...options,
        };
        return this._makeRequest(url, config, false);
    }

    // Método para requests públicos
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
        return this.publicRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, contrasena }),
        }).then(data => {
            if (data.token) {
                localStorage.setItem('token', data.token);
                if (data.email) localStorage.setItem('userEmail', data.email); // Usar email de la respuesta si viene
                else if (email) localStorage.setItem('userEmail', email);
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
                if (data.email) localStorage.setItem('userEmail', data.email);
                else if (email) localStorage.setItem('userEmail', email);
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

    // --- PERFIL DE USUARIO (Autenticado) ---
    getCurrentUserProfile() {
        const token = this.getStoredToken();
        if (!token) return Promise.resolve(null);
        return this.request('/api/usuarios/perfil', { method: 'GET' })
            .then(profileData => ({ ...profileData, token }))
            .catch(error => {
                console.error('Error fetching user profile:', error);
                if (error.message.includes('401')) this.logout();
                return null;
            });
    }

    /**
     * Actualiza el perfil del usuario logueado.
     * @param {object} profileData - Objeto con { nombre, apellido, email } a actualizar.
     * @returns {Promise<object>} - Promesa con los datos del perfil actualizado.
     */
    actualizarPerfil(profileData) {
        return this.request('/api/usuarios/perfil', {
            method: 'PUT',
            body: JSON.stringify(profileData),
        });
    }

    /**
     * Cambia la contraseña del usuario logueado.
     * @param {string} contrasenaActual - Contraseña actual.
     * @param {string} contrasenaNueva - Contraseña nueva.
     * @returns {Promise<object>} - Promesa que resuelve si el cambio fue exitoso.
     */
    cambiarContrasena(contrasenaActual, contrasenaNueva) {
        return this.request('/api/usuarios/perfil/cambiar-contrasena', {
            method: 'PUT',
            body: JSON.stringify({ contrasenaActual, contrasenaNueva }),
        });
    }

    getDirecciones() {
        return this.request('/api/usuarios/direcciones', { method: 'GET' });
    }

    /**
     * Agrega una nueva dirección de envío.
     * @param {object} direccionData - Objeto con { calle, numero, ciudad, cp }.
     * @returns {Promise<object>} - Promesa con la dirección creada.
     */
    agregarDireccion(direccionData) {
        return this.request('/api/usuarios/direcciones', {
            method: 'POST',
            body: JSON.stringify(direccionData),
        });
    }

    getMetodosPago() {
        return this.request('/api/usuarios/metodos-pago', { method: 'GET' });
    }

    /**
     * Agrega un nuevo método de pago.
     * @param {object} metodoPagoData - Objeto con { tipo, proveedor }.
     * @returns {Promise<object>} - Promesa con el método de pago creado.
     */
    agregarMetodoPago(metodoPagoData) {
        return this.request('/api/usuarios/metodos-pago', {
            method: 'POST',
            body: JSON.stringify(metodoPagoData),
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

    // --- PEDIDOS (Autenticado) ---
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

