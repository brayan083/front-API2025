import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../lib/api';
import './UserProfile.css';

export const UserProfile = () => {
    const { user, loading: authLoading } = useAuth();
    const [direcciones, setDirecciones] = useState([]);
    const [metodosPago, setMetodosPago] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState('');

    // Estados para los formularios de agregar
    const [showDireccionForm, setShowDireccionForm] = useState(false);
    const [newDireccion, setNewDireccion] = useState({ calle: '', numero: '', ciudad: '', cp: '' });
    const [showMetodoPagoForm, setShowMetodoPagoForm] = useState(false);
    const [newMetodoPago, setNewMetodoPago] = useState({ tipo: '', proveedor: '' });
    const [formLoading, setFormLoading] = useState(false);
    const [formSuccess, setFormSuccess] = useState('');

    // Cargar datos del perfil (direcciones, métodos de pago)
    useEffect(() => {
        const loadProfileData = async () => {
            if (!user) {
                setLoadingData(false);
                return;
            }
            setLoadingData(true);
            setError('');
            try {
                const [direccionesData, metodosPagoData] = await Promise.all([
                    apiService.getDirecciones(),
                    apiService.getMetodosPago()
                ]);
                setDirecciones(direccionesData || []);
                setMetodosPago(metodosPagoData || []);
            } catch (err) {
                console.error("Error loading profile data:", err);
                setError('No se pudieron cargar los datos del perfil. ' + err.message);
            } finally {
                setLoadingData(false);
            }
        };

        if (!authLoading) { // Solo cargar después de que la autenticación inicial termine
            loadProfileData();
        }
    }, [user, authLoading]); // Recargar si el usuario cambia o termina la carga inicial

    // --- Manejadores para agregar Dirección ---
    const handleDireccionChange = (e) => {
        setNewDireccion({ ...newDireccion, [e.target.name]: e.target.value });
    };

    const handleAddDireccion = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setError('');
        setFormSuccess('');
        try {
            const direccionCreada = await apiService.agregarDireccion(newDireccion);
            setDirecciones([...direcciones, direccionCreada]); // Añadir a la lista
            setNewDireccion({ calle: '', numero: '', ciudad: '', cp: '' }); // Limpiar formulario
            setShowDireccionForm(false); // Ocultar formulario
            setFormSuccess('¡Dirección agregada con éxito!');
            setTimeout(() => setFormSuccess(''), 3000); // Limpiar mensaje después de 3s
        } catch (err) {
            console.error("Error adding address:", err);
            setError('Error al agregar dirección: ' + err.message);
        } finally {
            setFormLoading(false);
        }
    };

    // --- Manejadores para agregar Método de Pago ---
    const handleMetodoPagoChange = (e) => {
        setNewMetodoPago({ ...newMetodoPago, [e.target.name]: e.target.value });
    };

    const handleAddMetodoPago = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setError('');
        setFormSuccess('');
        try {
            const metodoCreado = await apiService.agregarMetodoPago(newMetodoPago);
            setMetodosPago([...metodosPago, metodoCreado]); // Añadir a la lista
            setNewMetodoPago({ tipo: '', proveedor: '' }); // Limpiar formulario
            setShowMetodoPagoForm(false); // Ocultar formulario
            setFormSuccess('¡Método de pago agregado con éxito!');
            setTimeout(() => setFormSuccess(''), 3000);
        } catch (err) {
            console.error("Error adding payment method:", err);
            setError('Error al agregar método de pago: ' + err.message);
        } finally {
            setFormLoading(false);
        }
    };

    // Mostrar carga si la autenticación o los datos del perfil están cargando
    if (authLoading || loadingData) {
        return <div className="loading">Cargando perfil...</div>;
    }

    // Si no hay usuario después de cargar, mostrar mensaje
    if (!user) {
        return <div className="profile-container error-message">Debes iniciar sesión para ver tu perfil.</div>;
    }

    return (
        <div className="profile-container">
            <h2>Mi Perfil</h2>

            {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}
            {formSuccess && <div className="success-message" style={{ marginBottom: '1rem' }}>{formSuccess}</div>}

            <div className="profile-section">
                <h3>Información Personal</h3>
                <p><strong>Nombre:</strong> {user.nombre || 'N/A'}</p>
                <p><strong>Apellido:</strong> {user.apellido || 'N/A'}</p>
                <p><strong>Email:</strong> {user.email || 'N/A'}</p>
                {/* Aquí podrías añadir un botón para editar perfil si implementas esa función */}
            </div>

            <div className="profile-section">
                <h3>Direcciones de Envío</h3>
                {direcciones.length === 0 ? (
                    <p>No tienes direcciones guardadas.</p>
                ) : (
                    <ul>
                        {direcciones.map(dir => (
                            <li key={dir.id}>
                                {dir.calle} {dir.numero}, {dir.ciudad} ({dir.cp})
                                {/* Podrías añadir botones de editar/eliminar aquí */}
                            </li>
                        ))}
                    </ul>
                )}
                <button onClick={() => setShowDireccionForm(!showDireccionForm)} className="btn-add">
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

            <div className="profile-section">
                <h3>Métodos de Pago</h3>
                {metodosPago.length === 0 ? (
                    <p>No tienes métodos de pago guardados.</p>
                ) : (
                    <ul>
                        {metodosPago.map(met => (
                            <li key={met.id}>
                                {met.tipo} - {met.proveedor}
                                {/* Podrías añadir botones de editar/eliminar aquí */}
                            </li>
                        ))}
                    </ul>
                )}
                <button onClick={() => setShowMetodoPagoForm(!showMetodoPagoForm)} className="btn-add">
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

            {/* Sección para cambiar contraseña (opcional) */}
            {/* <div className="profile-section"> ... formulario cambio contraseña ... </div> */}

        </div>
    );
};