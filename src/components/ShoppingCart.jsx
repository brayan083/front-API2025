import { useState, useEffect, useCallback } from 'react'; // Añadir useCallback
import PropTypes from 'prop-types';
import { apiService } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export const ShoppingCart = ({ isOpen, onClose, cartUpdated, onCartUpdate }) => {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [checkoutLoading, setCheckoutLoading] = useState(false); // Estado para el checkout
    const [checkoutError, setCheckoutError] = useState(''); // Estado para errores de checkout
    const { user } = useAuth();

    // Función helper para formatear precios
    const formatPrice = (price) => {
        // Asegurarse de que price sea un número antes de formatear
        const numericPrice = Number(price);
        if (isNaN(numericPrice)) {
            // Devolver un valor por defecto o un string vacío si no es un número válido
            return '$ --.--'; // O '$ 0.00'
        }
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS', // Cambiado a ARS si prefieres pesos argentinos
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(numericPrice);
    };


    // Usar useCallback para memoizar fetchCartItems
    const fetchCartItems = useCallback(async () => {
        if (!user || !isOpen) return; // Salir si no hay usuario o el carrito no está abierto

        setLoading(true);
        setCheckoutError(''); // Limpiar errores previos al recargar
        try {
            const carritoData = await apiService.getCarrito();
            const newItems = Array.isArray(carritoData?.items) ? carritoData.items : [];

            // Simplificado: usar directamente los items del backend
            setCartItems(newItems);

        } catch (error) {
            console.error("Error fetching cart items:", error);
            // Mostrar error específico si es 401 (token expirado?)
            if (error.message.includes('401')) {
                setCheckoutError("Tu sesión ha expirado. Por favor, inicia sesión de nuevo.");
                // Opcional: podrías llamar a logout aquí si AuthContext no lo hace
            } else {
                setCheckoutError("No se pudo cargar el carrito. Intenta de nuevo.");
            }
            setCartItems([]); // Limpiar items en caso de error
        } finally {
            setLoading(false);
        }
    }, [user, isOpen]); // Dependencias: user e isOpen


    // Llamar a fetchCartItems cuando cambien sus dependencias o cartUpdated
    useEffect(() => {
        fetchCartItems();
    }, [fetchCartItems, cartUpdated]); // fetchCartItems ahora es una dependencia estable


    const updateQuantity = async (productoId, newQuantity) => {
        // Lógica existente... (sin cambios aquí)
        if (newQuantity < 1) {
            await removeItem(productoId);
            return;
        }
        // Estado optimista
        const originalItems = [...cartItems]; // Guardar estado original
        setCartItems(prevItems =>
            prevItems.map(item => {
                if (item.idProducto === productoId) {
                    const precioUnitario = parseFloat(item.precioUnitario || item.precio || 0);
                    const subtotalCalculado = precioUnitario * newQuantity;
                    return {
                        ...item,
                        cantidad: newQuantity,
                        // Asegurarse que subtotal sea un número antes de toFixed
                        subtotal: isNaN(subtotalCalculado) ? '0.00' : subtotalCalculado.toFixed(2)
                    };
                }
                return item;
            })
        );

        try {
            // Eliminar y volver a agregar en el backend
            await apiService.eliminarDelCarrito(productoId);
            await apiService.agregarAlCarrito(productoId, newQuantity);
            if (onCartUpdate) {
                await onCartUpdate(); // Notifica al Header para actualizar contador
            }
        } catch (error) {
            console.error('Error updating quantity:', error);
            setCartItems(originalItems); // Revertir en caso de error
            alert('Error al actualizar cantidad. Inténtalo de nuevo.');
            if (onCartUpdate) {
                await onCartUpdate(); // Re-sincronizar contador si falla
            }
        }
    };

    const removeItem = async (productoId) => {
        // Lógica existente... (sin cambios aquí)
        const originalItems = [...cartItems];
        setCartItems(prevItems => prevItems.filter(item => item.idProducto !== productoId));
        try {
            await apiService.eliminarDelCarrito(productoId);
            if (onCartUpdate) {
                await onCartUpdate();
            }
        } catch (error) {
            console.error('Error removing item:', error);
            setCartItems(originalItems); // Revertir en caso de error
            alert('Error al eliminar el producto. Inténtalo de nuevo.');
            if (onCartUpdate) {
                await onCartUpdate();
            }
        }
    };

    // --- NUEVA LÓGICA PARA CHECKOUT ---
    const handleCheckout = async () => {
        setCheckoutLoading(true);
        setCheckoutError(''); // Limpiar errores previos

        if (cartItems.length === 0) {
            setCheckoutError("El carrito está vacío.");
            setCheckoutLoading(false);
            return;
        }

        try {
            // 1. Obtener direcciones y métodos de pago
            const [direcciones, metodosPago] = await Promise.all([
                apiService.getDirecciones(),
                apiService.getMetodosPago()
            ]);

            // 2. Validar que existan y tomar el primero de cada uno
            if (!direcciones || direcciones.length === 0) {
                throw new Error("No tienes direcciones de envío registradas. Por favor, agrega una en tu perfil.");
            }
            if (!metodosPago || metodosPago.length === 0) {
                throw new Error("No tienes métodos de pago registrados. Por favor, agrega uno en tu perfil.");
            }

            const primeraDireccionId = direcciones[0].id;
            const primerMetodoPagoId = metodosPago[0].id;

            if (!primeraDireccionId || !primerMetodoPagoId) {
                throw new Error("No se pudieron obtener los IDs de dirección o método de pago.");
            }

            // 3. Llamar a crearPedido
            const pedidoCreado = await apiService.crearPedido(primeraDireccionId, primerMetodoPagoId);

            // 4. Éxito: Mostrar mensaje, actualizar carrito y cerrar
            console.log("Pedido creado:", pedidoCreado); // Log para ver la respuesta
            alert(`¡Pedido #${pedidoCreado.id} realizado con éxito!`); // Mensaje simple
            setCartItems([]); // Vaciar carrito localmente
            if (onCartUpdate) {
                await onCartUpdate(); // Actualizar contador en Header
            }
            onClose(); // Cerrar sidebar del carrito

        } catch (error) {
            console.error("Error durante el checkout:", error);
            // Mostrar el mensaje de error específico de la API o uno genérico
            setCheckoutError(error.message || "Ocurrió un error al procesar el pedido. Inténtalo de nuevo.");
        } finally {
            setCheckoutLoading(false);
        }
    };


    // Calcular total
    const total = cartItems.reduce((sum, item) => {
        // Asegurarse de que subtotal sea un número válido
        const subtotalNum = Number(item.subtotal);
        return sum + (isNaN(subtotalNum) ? 0 : subtotalNum);
    }, 0);


    if (!isOpen) return null;

    return (
        <div className="cart-overlay" onClick={onClose}>
            <div className="cart-sidebar" onClick={(e) => e.stopPropagation()}>
                <div className="cart-header">
                    <h2>Carrito de Compras</h2>
                    <button className="close-btn" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="cart-content">
                    {loading ? (
                        <div className="loading">Cargando carrito...</div>
                    ) : cartItems.length === 0 && !checkoutError ? ( // Mostrar solo si no hay error de carga
                        <div className="empty-cart">Tu carrito está vacío</div>
                    ) : (
                        <>
                            {/* Mostrar error de carga/checkout aquí si existe */}
                            {checkoutError && !loading && (
                                <div className="error-message" style={{ margin: '1rem', textAlign: 'center' }}>
                                    {checkoutError}
                                </div>
                            )}
                            {cartItems.length > 0 && (
                                <div className="cart-items">
                                    {cartItems.map((item) => (
                                        // ... (resto del mapeo de cart-item sin cambios)
                                        <div key={item.idProducto || `item-${Math.random()}`} className="cart-item">
                                            <div className="cart-item-image-container">
                                                <img
                                                    // Usar placeholder si no hay imagen específica
                                                    src={item.imagenBase64 ? `data:image/png;base64,${item.imagenBase64}` : '/placeholder-product.png'}
                                                    alt={item.nombreProducto || 'Producto'}
                                                    className="cart-item-image"
                                                    onError={(e) => { e.target.src = '/placeholder-product.png'; }}
                                                />
                                            </div>
                                            <div className="cart-item-info">
                                                <div className="cart-item-details">
                                                    <h4 className="cart-item-name">{item.nombreProducto || 'Producto desconocido'}</h4>
                                                    <p className="cart-item-price">
                                                        {/* Usar precio o precioUnitario */}
                                                        {formatPrice(item.precioUnitario || item.precio || 0)}
                                                    </p>
                                                    {/* Mostrar subtotal si existe y es diferente del precio unitario */}
                                                    {item.subtotal && parseFloat(item.subtotal) !== parseFloat(item.precioUnitario || item.precio || 0) && (
                                                        <p className="cart-item-subtotal">
                                                            Subtotal: {formatPrice(item.subtotal)}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="cart-item-controls">
                                                    <div className="quantity-controls">
                                                        <button
                                                            className="quantity-btn quantity-btn-minus"
                                                            onClick={() => updateQuantity(item.idProducto, (item.cantidad || 1) - 1)}
                                                            aria-label="Disminuir cantidad"
                                                            disabled={checkoutLoading} // Deshabilitar durante checkout
                                                        >
                                                            −
                                                        </button>
                                                        <span className="quantity-display">{item.cantidad || 0}</span>
                                                        <button
                                                            className="quantity-btn quantity-btn-plus"
                                                            onClick={() => updateQuantity(item.idProducto, (item.cantidad || 0) + 1)}
                                                            aria-label="Aumentar cantidad"
                                                            disabled={checkoutLoading} // Deshabilitar durante checkout
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                    <button
                                                        className="remove-btn"
                                                        onClick={() => removeItem(item.idProducto)}
                                                        aria-label="Eliminar producto"
                                                        disabled={checkoutLoading} // Deshabilitar durante checkout
                                                    >
                                                        🗑️ Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {/* Footer siempre visible si el carrito no está vacío o hay error */}
                            {(cartItems.length > 0 || checkoutError) && !loading && (
                                <div className="cart-footer">
                                    {/* Mostrar error de checkout aquí también */}
                                    {checkoutError && (
                                        <div className="error-message" style={{ marginBottom: '1rem' }}>
                                            {checkoutError}
                                        </div>
                                    )}
                                    <div className="cart-summary">
                                        <div className="cart-items-count">
                                            {/* Calcular items totales */}
                                            {cartItems.reduce((acc, item) => acc + (item.cantidad || 0), 0)} items
                                        </div>
                                        <div className="cart-total">
                                            <span className="total-label">Total:</span>
                                            <span className="total-amount">{formatPrice(total)}</span>
                                        </div>
                                    </div>
                                    <button
                                        className="btn-checkout"
                                        onClick={handleCheckout}
                                        disabled={cartItems.length === 0 || loading || checkoutLoading} // Deshabilitar si está vacío, cargando o procesando checkout
                                    >
                                        {checkoutLoading ? 'Procesando...' : '💳 Proceder al Pago'}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

ShoppingCart.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    cartUpdated: PropTypes.number,
    onCartUpdate: PropTypes.func,
};
