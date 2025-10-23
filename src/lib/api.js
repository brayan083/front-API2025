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
                const errorData = await response.json().catch(() => ({ message: response.statusText || 'Error desconocido' }));
                let errorMessage = `Error ${response.status}: ${errorData.message || response.statusText}`;

                // Mapeo de códigos de estado a mensajes más amigables
                switch (response.status) {
                    case 400: // Bad Request
                        errorMessage = errorData.errors ? `Error de validación: ${errorData.errors.join(', ')}` : (errorData.message || 'Datos inválidos.');
                        break;
                    case 401: // Unauthorized
                        errorMessage = errorData.message || 'Credenciales incorrectas o sesión inválida/expirada.';
                        if (!isPublic) {
                            this.logout();
                            // Opcional: Considerar recargar la página para limpiar estado
                            // window.location.reload();
                        }
                        break;
                    case 403: // Forbidden
                        errorMessage = errorData.message || 'Acceso denegado.';
                        break;
                    case 404: // Not Found
                        errorMessage = errorData.message || 'Recurso no encontrado.';
                        break;
                    case 409: // Conflict
                        errorMessage = errorData.message || 'Conflicto de datos.';
                        break;
                    case 500: // Internal Server Error
                        errorMessage = errorData.message || 'Error interno del servidor.';
                        break;
                }
                throw new Error(errorMessage);
            }

            // Procesar respuesta exitosa
            const contentType = response.headers.get('content-type');
            if (response.status === 204) { return { success: true }; } // No Content
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                const text = await response.text();
                try { return JSON.parse(text); } catch (e) { return text ? text : { success: true }; }
            }

        } catch (error) {
            if (error.message.startsWith('Error ')) { throw error; }
            if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('NetworkError'))) {
                console.error(`Network Error connecting to ${url}:`, error);
                throw new Error(`Error de Red: No se pudo conectar al servidor en ${API_BASE_URL}.`);
            }
            console.error(`API Request Error (catch general) to ${url}:`, error);
            throw error instanceof Error ? error : new Error('Error inesperado.');
        }
    }

    // Requests autenticadas
    request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const token = this.getStoredToken();
        const config = {
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
            ...options,
        };
        if (!token && !endpoint.startsWith('/api/auth/') && !endpoint.startsWith('/api/productos') && !endpoint.startsWith('/api/categorias') && !endpoint.startsWith('/api/marcas')) {
            console.warn(`Attempting authenticated request to ${endpoint} without a token.`);
            // Podríamos lanzar un error aquí si es preferible
            // return Promise.reject(new Error("Se requiere autenticación para esta acción."));
        }
        return this._makeRequest(url, config, false);
    }


    // Requests públicas
    publicRequest(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = { headers: { 'Content-Type': 'application/json', ...options.headers }, ...options };
        return this._makeRequest(url, config, true);
    }

    // --- AUTENTICACIÓN ---
    login(email, contrasena) {
        return this.publicRequest('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, contrasena }) })
            .then(data => { if (data.token) { localStorage.setItem('token', data.token); localStorage.setItem('userEmail', data.email || email); } return data; });
    }
    register(nombre, apellido, email, contrasena) {
        return this.publicRequest('/api/auth/registrar', { method: 'POST', body: JSON.stringify({ nombre, apellido, email, contrasena }) })
            .then(data => { if (data.token) { localStorage.setItem('token', data.token); localStorage.setItem('userEmail', data.email || email); } return data; });
    }
    logout() { localStorage.removeItem('token'); localStorage.removeItem('userEmail'); }
    getStoredToken() { return localStorage.getItem('token'); }
    getStoredEmail() { return localStorage.getItem('userEmail'); }

    // --- PERFIL DE USUARIO ---
    getCurrentUserProfile() {
        const token = this.getStoredToken();
        if (!token) return Promise.resolve(null);
        return this.request('/api/usuarios/perfil', { method: 'GET' })
            .then(profileData => ({ ...profileData, token }))
            .catch(error => { console.error('Error fetching profile:', error); if (error.message.includes('401') || error.message.includes('403')) { this.logout(); } return null; });
    }
    actualizarPerfil(profileData) {
        const dataToSend = Object.fromEntries(Object.entries(profileData).filter(([, value]) => value !== null && value !== ''));
        return this.request('/api/usuarios/perfil', { method: 'PUT', body: JSON.stringify(dataToSend) });
    }
    cambiarContrasena(contrasenaActual, contrasenaNueva) {
        if (!contrasenaActual || !contrasenaNueva) { return Promise.reject(new Error("Contraseñas requeridas.")); }
        return this.request('/api/usuarios/perfil/cambiar-contrasena', { method: 'PUT', body: JSON.stringify({ contrasenaActual, contrasenaNueva }) });
    }
    getDirecciones() { return this.request('/api/usuarios/direcciones', { method: 'GET' }); }
    agregarDireccion(direccionData) {
        if (!direccionData.calle || !direccionData.numero || !direccionData.ciudad || !direccionData.cp) { return Promise.reject(new Error("Campos de dirección obligatorios.")); }
        return this.request('/api/usuarios/direcciones', { method: 'POST', body: JSON.stringify(direccionData) });
    }
    getMetodosPago() { return this.request('/api/usuarios/metodos-pago', { method: 'GET' }); }
    agregarMetodoPago(metodoPagoData) {
        if (!metodoPagoData.tipo || !metodoPagoData.proveedor) { return Promise.reject(new Error("Tipo y Proveedor obligatorios.")); }
        return this.request('/api/usuarios/metodos-pago', { method: 'POST', body: JSON.stringify(metodoPagoData) });
    }

    // --- PRODUCTOS, CATÁLOGO (Públicos) ---
    getProductos(filtros = {}) {
        const params = new URLSearchParams();
        if (filtros.q) params.append('q', String(filtros.q));
        if (filtros.categoria) params.append('categoria', String(filtros.categoria));
        if (filtros.marca) params.append('marca', String(filtros.marca));
        if (filtros.min) params.append('min', String(filtros.min));
        if (filtros.max) params.append('max', String(filtros.max));
        if (filtros.page !== undefined) params.append('page', String(filtros.page));
        if (filtros.size !== undefined) params.append('size', String(filtros.size));
        if (filtros.sort) params.append('sort', String(filtros.sort));
        const queryString = params.toString();
        const endpoint = queryString ? `/api/productos?${queryString}` : '/api/productos';
        return this.publicRequest(endpoint, { method: 'GET' });
    }
    getProducto(id) { return this.publicRequest(`/api/productos/${id}`, { method: 'GET' }); }
    getCategorias() { return this.publicRequest('/api/categorias', { method: 'GET' }); }
    getMarcas() { return this.publicRequest('/api/marcas', { method: 'GET' }); }

    // --- CARRITO (Autenticado) ---
    getCarrito() { return this.request('/api/carrito', { method: 'GET' }); }
    agregarAlCarrito(idProducto, cantidad = 1) { return this.request('/api/carrito/items', { method: 'POST', body: JSON.stringify({ id_producto: idProducto, cantidad: cantidad }) }); }
    eliminarDelCarrito(idProducto) { return this.request(`/api/carrito/items/${idProducto}`, { method: 'DELETE' }); }

    // --- PEDIDOS (Autenticado) ---
    crearPedido(idDireccionEnvio, idMetodoPago) { return this.request('/api/pedidos', { method: 'POST', body: JSON.stringify({ id_direccion_envio: idDireccionEnvio, id_metodo_pago: idMetodoPago }) }); }

    /**
     * Obtiene el historial de pedidos del usuario logueado (paginado).
     * @param {object} [pageable={ page: 0, size: 10, sort: 'fecha,desc' }] - Opciones de paginación.
     * @returns {Promise<object>} - Promesa con la página de resúmenes de pedidos.
     */
    getHistorialPedidos(pageable = { page: 0, size: 10, sort: 'fecha,desc' }) {
        const params = new URLSearchParams();
        params.append('page', String(pageable.page || 0));
        params.append('size', String(pageable.size || 10));
        params.append('sort', String(pageable.sort || 'fecha,desc'));
        // Asegurarse de usar 'request' (autenticado)
        return this.request(`/api/pedidos?${params.toString()}`, { method: 'GET' });
    }

    /**
     * Obtiene el detalle completo de un pedido específico del usuario logueado.
     * @param {number | string} pedidoId - El ID del pedido.
     * @returns {Promise<object>} - Promesa con el detalle del pedido.
     */
    getDetallePedido(pedidoId) {
        if (!pedidoId) return Promise.reject(new Error("Se requiere el ID del pedido."));
        // Asegurarse de usar 'request' (autenticado)
        return this.request(`/api/pedidos/${pedidoId}`, { method: 'GET' });
    }

}

export const apiService = new ApiService();

