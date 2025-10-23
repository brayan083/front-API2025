import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../lib/api';
import './UserProfile.css'; // Asegúrate de que este archivo CSS exista

// Helper para formatear fecha
const formatFecha = (fechaISO) => {
    if (!fechaISO) return 'Fecha inválida';
    try {
        const fecha = new Date(fechaISO);
        // Verificar si la fecha es válida
        if (isNaN(fecha.getTime())) {
            return 'Fecha inválida';
        }
        // Usar formato local de Argentina
        return fecha.toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false // Formato 24 horas si se prefiere
        });
    } catch (e) {
        console.error("Error formatting date:", fechaISO, e);
        return 'Fecha inválida';
    }
};

// Helper para formatear moneda (Pesos Argentinos ARS)
const formatPrice = (price) => {
    const numericPrice = Number(price);
    if (isNaN(numericPrice)) { return '$ --.--'; }
    // Configurar para pesos argentinos
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numericPrice);
};


export const UserProfile = () => {
    const { user, loading: authLoading } = useAuth();
    const [direcciones, setDirecciones] = useState([]);
    const [metodosPago, setMetodosPago] = useState([]);
    const [pedidos, setPedidos] = useState([]); // Estado para pedidos
    const [loadingData, setLoadingData] = useState(true); // Carga inicial (direcc, metodos)
    const [loadingPedidos, setLoadingPedidos] = useState(true); // Carga específica para pedidos
    const [error, setError] = useState('');

    // Estados para formularios
    const [showDireccionForm, setShowDireccionForm] = useState(false);
    const [newDireccion, setNewDireccion] = useState({ calle: '', numero: '', ciudad: '', cp: '' });
    const [showMetodoPagoForm, setShowMetodoPagoForm] = useState(false);
    const [newMetodoPago, setNewMetodoPago] = useState({ tipo: '', proveedor: '' });
    const [formLoading, setFormLoading] = useState(false);
    const [formSuccess, setFormSuccess] = useState('');

    // Cargar datos del perfil (direcciones, métodos de pago, PEDIDOS)
    useEffect(() => {
        const loadProfileData = async () => {
            // Si no hay usuario (aún cargando o deslogueado), no hacer nada
            if (!user) {
                setLoadingData(false);
                setLoadingPedidos(false);
                return;
            }

            setLoadingData(true);
            setLoadingPedidos(true);
            setError(''); // Limpiar errores previos

            try {
                // Cargar direcciones y métodos en paralelo
                const [direccionesData, metodosPagoData] = await Promise.all([
                    apiService.getDirecciones(),
                    apiService.getMetodosPago()
                ]).catch(err => {
                    console.error("Error loading addresses/payment methods:", err);
                    setError(prev => (prev ? prev + ' ' : '') + 'Error al cargar direcciones/métodos.'); // Acumular errores
                    return [[], []]; // Devolver arrays vacíos para que no falle el resto
                });
                setDirecciones(direccionesData || []);
                setMetodosPago(metodosPagoData || []);
            } catch (err) {
                // Captura errores si Promise.all falla antes del .catch interno (raro)
                console.error("Unexpected error loading basic profile data:", err);
                setError(prev => (prev ? prev + ' ' : '') + 'Error inesperado cargando datos básicos.');
            } finally {
                setLoadingData(false); // Marcar como terminada la carga de datos básicos
            }

            // Cargar historial de pedidos (después o en paralelo si no dependen)
            try {
                const pedidosData = await apiService.getHistorialPedidos({ page: 0, size: 20 }); // Pedir ej. 20 más recientes
                setPedidos(pedidosData?.content || []); // Guardar solo el contenido de la página
            } catch (pedidoErr) {
                console.error("Error loading order history:", pedidoErr);
                setError(prev => (prev ? prev + ' ' : '') + 'No se pudo cargar el historial de pedidos.');
                setPedidos([]); // Asegurar array vacío en caso de error
            } finally {
                setLoadingPedidos(false); // Marcar como terminada la carga de pedidos
            }
        };

        // Ejecutar solo cuando la carga de autenticación haya terminado
        if (!authLoading) {
            loadProfileData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, authLoading]); // Dependencias: user y authLoading

    // --- Manejadores de Formularios (sin cambios respecto a la versión anterior) ---
    const handleDireccionChange = (e) => { setNewDireccion({ ...newDireccion, [e.target.name]: e.target.value }); };
    const handleAddDireccion = async (e) => {
        e.preventDefault();
        setFormLoading(true); setError(''); setFormSuccess('');
        try {
            if (!newDireccion.calle || !newDireccion.numero || !newDireccion.ciudad || !newDireccion.cp) throw new Error("Campos obligatorios.");
            const direccionCreada = await apiService.agregarDireccion(newDireccion);
            setDirecciones(prev => [...prev, direccionCreada]);
            setNewDireccion({ calle: '', numero: '', ciudad: '', cp: '' }); setShowDireccionForm(false);
            setFormSuccess('¡Dirección agregada!'); setTimeout(() => setFormSuccess(''), 3000);
        } catch (err) { setError('Error: ' + err.message); } finally { setFormLoading(false); }
    };
    const handleMetodoPagoChange = (e) => { setNewMetodoPago({ ...newMetodoPago, [e.target.name]: e.target.value }); };
    const handleAddMetodoPago = async (e) => {
        e.preventDefault();
        setFormLoading(true); setError(''); setFormSuccess('');
        try {
            if (!newMetodoPago.tipo || !newMetodoPago.proveedor) throw new Error("Campos obligatorios.");
            const metodoCreado = await apiService.agregarMetodoPago(newMetodoPago);
            setMetodosPago(prev => [...prev, metodoCreado]);
            setNewMetodoPago({ tipo: '', proveedor: '' }); setShowMetodoPagoForm(false);
            setFormSuccess('¡Método de pago agregado!'); setTimeout(() => setFormSuccess(''), 3000);
        } catch (err) { setError('Error: ' + err.message); } finally { setFormLoading(false); }
    };

    // --- Renderizado ---
    if (authLoading) { return <div className="loading">Cargando...</div>; }
    if (!user) { return <div className="profile-container error-message">Debes iniciar sesión para ver tu perfil.</div>; }

    return (
        <div className="profile-container">
            <h2>Mi Perfil</h2>

            {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}
            {formSuccess && <div className="success-message" style={{ marginBottom: '1rem' }}>{formSuccess}</div>}

            {/* --- Sección Información Personal --- */}
            <div className="profile-section">
                <h3>Información Personal</h3>
                {/* Mostrar datos del usuario del contexto */}
                <p><strong>Nombre:</strong> {user.nombre || 'N/A'}</p>
                <p><strong>Apellido:</strong> {user.apellido || 'N/A'}</p>
                <p><strong>Email:</strong> {user.email || 'N/A'}</p>
                {/* Aquí podrías añadir botones/formularios para editar perfil y cambiar contraseña */}
            </div>

            {/* --- Sección Historial de Pedidos --- */}
            <div className="profile-section">
                <h3>Historial de Pedidos</h3>
                {loadingPedidos ? (
                    <p>Cargando historial de pedidos...</p>
                ) : pedidos.length === 0 ? (
                    <p>No has realizado ningún pedido todavía.</p>
                ) : (
                    <ul className="order-history-list">
                        {pedidos.map(pedido => (
                            <li key={pedido.id} className="order-summary-item">
                                <div className="order-summary-header">
                                    <span className="order-id">Pedido #{pedido.id}</span>
                                    <span className="order-date">{formatFecha(pedido.fecha)}</span>
                                </div>
                                <div className="order-summary-body">
                                    <span className="order-status">Estado: {pedido.estado || 'N/A'}</span>
                                    <span className="order-items">Items: {pedido.cantidadItems ?? 'N/A'}</span> {/* Usar ?? para mostrar N/A si es null/undefined */}
                                    <span className="order-total">Total: {formatPrice(pedido.total)}</span>
                                </div>
                                {/* Aquí podrías añadir un Link o botón para ir al detalle */}
                                {/* <Link to={`/pedidos/${pedido.id}`}>Ver Detalle</Link> */}
                            </li>
                        ))}
                    </ul>
                    )}
                {/* Opcional: Añadir botones de paginación si hay más pedidos */}
            </div>


            {/* --- Sección Direcciones --- */}
            <div className="profile-section">
                <h3>Direcciones de Envío</h3>
                {loadingData ? <p>Cargando direcciones...</p> : direcciones.length === 0 ? (
                    <p>No tienes direcciones guardadas.</p>
                ) : (
                    <ul>{direcciones.map(dir => <li key={dir.id}>{dir.calle} {dir.numero}, {dir.ciudad} ({dir.cp})</li>)}</ul>
                )}
                <button onClick={() => {setShowDireccionForm(!showDireccionForm); setError(''); setFormSuccess('');}} className="btn-add">
                    {showDireccionForm ? 'Cancelar' : '➕ Agregar Dirección'}
                </button>
                {showDireccionForm && (
                    <form onSubmit={handleAddDireccion} className="add-form">
                        <h4>Nueva Dirección</h4>
                        <div className="form-grid">
                            <input name="calle" value={newDireccion.calle} onChange={handleDireccionChange} placeholder="Calle" required />
                            <input name="numero" value={newDireccion.numero} onChange={handleDireccionChange} placeholder="Número" required />
                            <input name="ciudad" value={newDireccion.ciudad} onChange={handleDireccionChange} placeholder="Ciudad" required />
                            <input name="cp" value={newDireccion.cp} onChange={handleDireccionChange} placeholder="Código Postal" required />
                        </div>
                        <button type="submit" disabled={formLoading} className="btn-primary">
                            {formLoading ? 'Guardando...' : 'Guardar Dirección'}
                        </button>
                    </form>
                )}
            </div>

            {/* --- Sección Métodos de Pago --- */}
            <div className="profile-section">
                <h3>Métodos de Pago</h3>
                {loadingData ? <p>Cargando métodos...</p> : metodosPago.length === 0 ? (
                    <p>No tienes métodos de pago guardados.</p>
                ) : (
                    <ul>{metodosPago.map(met => <li key={met.id}>{met.tipo} - {met.proveedor}</li>)}</ul>
                )}
                <button onClick={() => {setShowMetodoPagoForm(!showMetodoPagoForm); setError(''); setFormSuccess('');}} className="btn-add">
                    {showMetodoPagoForm ? 'Cancelar' : '💳 Agregar Método de Pago'}
                </button>
                {showMetodoPagoForm && (
                    <form onSubmit={handleAddMetodoPago} className="add-form">
                        <h4>Nuevo Método de Pago</h4>
                        <div className="form-grid-condensed">
                            <input name="tipo" value={newMetodoPago.tipo} onChange={handleMetodoPagoChange} placeholder="Tipo (Ej: TARJETA_CREDITO)" required />
                            <input name="proveedor" value={newMetodoPago.proveedor} onChange={handleMetodoPagoChange} placeholder="Proveedor (Ej: VISA)" required />
                        </div>
                        <button type="submit" disabled={formLoading} className="btn-primary">
                            {formLoading ? 'Guardando...' : 'Guardar Método'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};