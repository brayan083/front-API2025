import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { apiService } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export const ShoppingCart = ({ isOpen, onClose, cartUpdated, onCartUpdate }) => {
  const [cartItems, setCartItems] = useState([]);
  // console.log('Cart Items:', cartItems);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const [showCheckout, setShowCheckout] = useState(false);
  const [metodosPago, setMetodosPago] = useState([]);
  const [direcciones, setDirecciones] = useState([]);
  const [selectedMetodo, setSelectedMetodo] = useState("");
  const [selectedDireccion, setSelectedDireccion] = useState("");
  const [nuevoMetodo, setNuevoMetodo] = useState({ tipo: '', proveedor: '' });
  const [nuevaDireccion, setNuevaDireccion] = useState({ calle: '', numero: '', ciudad: '', cp: '' });
  const [mensajeCheckout, setMensajeCheckout] = useState("");
  const [showAddMetodo, setShowAddMetodo] = useState(false);
  const [showAddDireccion, setShowAddDireccion] = useState(false);

  // Función helper para formatear precios
  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  useEffect(() => {
    if (user && isOpen) {
      fetchCartItems();
    }
  }, [user, isOpen, cartUpdated]);

  const fetchCartItems = async () => {
    setLoading(true);
    try {
      const carritoData = await apiService.getCarrito();
      
      // Adaptar la estructura de datos de tu backend
      const newItems = Array.isArray(carritoData) ? carritoData : (carritoData?.items || []);
      
      // Mantener el orden existente cuando sea posible
      setCartItems(prevItems => {
        if (prevItems.length === 0) {
          // Si no hay items previos, usar el orden del backend
          return newItems;
        }
        
        // Crear un mapa de los items actuales por ID para preservar el orden
        const existingOrderMap = new Map();
        prevItems.forEach((item, index) => {
          existingOrderMap.set(item.idProducto, index);
        });
        
        // Ordenar los nuevos items manteniendo el orden previo cuando sea posible
        const sortedNewItems = [...newItems].sort((a, b) => {
          const orderA = existingOrderMap.get(a.idProducto) ?? 999999;
          const orderB = existingOrderMap.get(b.idProducto) ?? 999999;
          return orderA - orderB;
        });
        
        return sortedNewItems;
      });
      
    } catch {
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productoId, newQuantity) => {
    if (newQuantity < 1) {
      // Si la nueva cantidad es menor a 1, eliminar el producto
      await removeItem(productoId);
      return;
    }

    try {
      // Actualizar optimísticamente el estado local ANTES de la llamada al backend
      setCartItems(prevItems => 
        prevItems.map(item => {
          if (item.idProducto === productoId) {
            const precioUnitario = parseFloat(item.precioUnitario || item.precio || 0);
            return {
              ...item,
              cantidad: newQuantity,
              subtotal: (precioUnitario * newQuantity).toFixed(2)
            };
          }
          return item;
        })
      );

      // Luego hacer las llamadas al backend
      await apiService.eliminarDelCarrito(productoId);
      await apiService.agregarAlCarrito(productoId, newQuantity);
      
      // Actualizar el contador del navbar
      if (onCartUpdate) {
        await onCartUpdate();
      }
      
    } catch (error) {
      console.error('Error actualizando cantidad:', error);
      // Si hay error, revertir el estado refrescando desde el backend
      await fetchCartItems();
      alert('Error al actualizar cantidad. Inténtalo de nuevo.');
    }
  };

  const removeItem = async (productoId) => {
    try {
      // Actualizar optimísticamente el estado local ANTES de la llamada al backend
      setCartItems(prevItems => prevItems.filter(item => item.idProducto !== productoId));
      
      // Luego hacer la llamada al backend
      await apiService.eliminarDelCarrito(productoId);
      
      // Actualizar el contador del navbar
      if (onCartUpdate) {
        await onCartUpdate();
      }
    } catch (error) {
      // Si hay error, revertir el estado refrescando desde el backend
      console.error('Error eliminando producto:', error);
      await fetchCartItems();
    }
  };

  const handleCheckoutClick = async () => {
    setShowCheckout(true);
    // Obtener métodos de pago y direcciones
    const pagos = await apiService.getMetodosPago();
    setMetodosPago(pagos.content || pagos || []);
    const dirs = await apiService.getDirecciones();
    setDirecciones(dirs.content || dirs || []);
  };

  const handleAddMetodo = async (e) => {
    e.preventDefault();
    const ok = await apiService.addMetodoPago(nuevoMetodo);
    if (ok) {
      setMensajeCheckout('Método de pago agregado correctamente');
      setNuevoMetodo({ tipo: '', proveedor: '' });
      const pagos = await apiService.getMetodosPago();
      setMetodosPago(pagos.content || pagos || []);
    } else {
      setMensajeCheckout('Error al agregar método de pago');
    }
  };

  const handleAddDireccion = async (e) => {
    e.preventDefault();
    const ok = await apiService.addDireccion(nuevaDireccion);
    if (ok) {
      setMensajeCheckout('Dirección agregada correctamente');
      setNuevaDireccion({ calle: '', numero: '', ciudad: '', cp: '' });
      const dirs = await apiService.getDirecciones();
      setDirecciones(dirs.content || dirs || []);
    } else {
      setMensajeCheckout('Error al agregar dirección');
    }
  };

  // Calcular total según la estructura de tu backend
  const total = cartItems.reduce((sum, item) => {
    // Usar subtotal directamente o calcular precio * cantidad
    const subtotal = parseFloat(item.subtotal || 0);
    return sum + subtotal;
  }, 0);

  if (!isOpen) return null;

  return (
    <div className="cart-modal">
      <div className="cart-modal-header">
        <h2>Carrito de Compras</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      <hr style={{margin: '12px 0'}} />
      {showCheckout && (
        <button className="btn-back" onClick={() => setShowCheckout(false)} style={{margin: '0 0 16px 0', background: '#f87171', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 0', fontWeight: '500', width: '60%', fontSize: '1rem', cursor: 'pointer', display: 'block', marginLeft: 'auto', marginRight: 'auto'}}>
          ← Volver al carrito
        </button>
      )}
      {!showCheckout ? (
        <>
          {/* Lista de productos en el carrito */}
          <div className="cart-products">
            {loading ? (
              <div className="loading">Cargando...</div>
            ) : cartItems.length === 0 ? (
              <div className="empty-cart">Tu carrito está vacío</div>
            ) : (
              cartItems.map((item) => (
                <div key={item.idProducto} className="cart-item">
                  <div className="cart-item-image-container">
                    <img
                      src={item.img ? `data:image/png;base64,${item.img}` : "/placeholder-product.png"}
                      alt={item.nombreProducto || 'Producto'}
                      className="cart-item-image"
                      onError={(e) => {
                        e.target.src = '/placeholder-product.png';
                      }}
                    />
                  </div>
                  
                  <div className="cart-item-info">
                    <div className="cart-item-details">
                      <h4 className="cart-item-name">{item.nombreProducto || 'Producto sin nombre'}</h4>
                      <p className="cart-item-price">
                        {formatPrice(item.precio || 0)}
                      </p>
                      <p className="cart-item-subtotal">
                        Subtotal: {formatPrice(item.subtotal || 0)}
                      </p>
                    </div>
                    
                    <div className="cart-item-controls">
                      <div className="quantity-controls">
                        <button
                          className="quantity-btn quantity-btn-minus"
                          onClick={() =>
                            updateQuantity(item.idProducto, (item.cantidad || 1) - 1)
                          }
                          aria-label="Disminuir cantidad"
                        >
                          −
                        </button>
                        <span className="quantity-display">{item.cantidad}</span>
                        <button
                          className="quantity-btn quantity-btn-plus"
                          onClick={() =>
                            updateQuantity(item.idProducto, (item.cantidad || 1) + 1)
                          }
                          aria-label="Aumentar cantidad"
                        >
                          +
                        </button>
                      </div>
                      
                      <button
                        className="remove-btn eliminar-btn"
                        onClick={() => removeItem(item.idProducto)}
                        aria-label="Eliminar producto"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="cart-modal-footer">
            <div className="cart-total">
              <span>Total:</span>
              <span className="cart-total-amount">US$ {total.toLocaleString()}</span>
            </div>
            <button className="btn-checkout" onClick={handleCheckoutClick}>
              <span style={{marginRight: '8px'}}>🧾</span>Proceder al Pago
            </button>
          </div>
        </>
      ) : (
        <div className="checkout-section">
          <div className="cart-total" style={{marginBottom: '18px'}}>
            <span>Total:</span>
            <span className="cart-total-amount">US$ {total.toLocaleString()}</span>
          </div>
          <div className="checkout-group">
            <h3>Selecciona método de pago</h3>
            <select value={selectedMetodo} onChange={e => setSelectedMetodo(e.target.value)}>
              <option value="">Selecciona...</option>
              {metodosPago.map(m => (
                <option key={m.id || m._id} value={m.id || m._id}>{m.tipo} - {m.proveedor}</option>
              ))}
            </select>
            {!showAddMetodo && (
              <button className="btn-checkout" style={{background: '#2563eb', margin: '8px 0', width: '100%', fontSize: '1rem'}} onClick={() => setShowAddMetodo(true)}>
                + Agregar método de pago
              </button>
            )}
            {showAddMetodo && (
              <form className="add-form" onSubmit={handleAddMetodo} style={{marginTop: '8px'}}>
                <input type="text" placeholder="Tipo" value={nuevoMetodo.tipo} onChange={e => setNuevoMetodo({...nuevoMetodo, tipo: e.target.value})} required />
                <input type="text" placeholder="Proveedor" value={nuevoMetodo.proveedor} onChange={e => setNuevoMetodo({...nuevoMetodo, proveedor: e.target.value})} required />
                <button type="submit" className="btn-checkout" style={{background: '#2563eb'}}>Agregar</button>
              </form>
            )}
          </div>
          <div className="checkout-group">
            <h3>Selecciona dirección</h3>
            <select value={selectedDireccion} onChange={e => setSelectedDireccion(e.target.value)}>
              <option value="">Selecciona...</option>
              {direcciones.map(d => (
                <option key={d.id || d._id} value={d.id || d._id}>{d.calle} {d.numero}, {d.ciudad} ({d.cp})</option>
              ))}
            </select>
            {!showAddDireccion && (
              <button className="btn-checkout" style={{background: '#2563eb', margin: '8px 0', width: '100%', fontSize: '1rem'}} onClick={() => setShowAddDireccion(true)}>
                + Agregar dirección
              </button>
            )}
            {showAddDireccion && (
              <form className="add-form" onSubmit={handleAddDireccion} style={{marginTop: '8px'}}>
                <input type="text" placeholder="Calle" value={nuevaDireccion.calle} onChange={e => setNuevaDireccion({...nuevaDireccion, calle: e.target.value})} required />
                <input type="text" placeholder="Número" value={nuevaDireccion.numero} onChange={e => setNuevaDireccion({...nuevaDireccion, numero: e.target.value})} required />
                <input type="text" placeholder="Ciudad" value={nuevaDireccion.ciudad} onChange={e => setNuevaDireccion({...nuevaDireccion, ciudad: e.target.value})} required />
                <input type="text" placeholder="CP" value={nuevaDireccion.cp} onChange={e => setNuevaDireccion({...nuevaDireccion, cp: e.target.value})} required />
                <button type="submit" className="btn-checkout" style={{background: '#2563eb'}}>Agregar</button>
              </form>
            )}
          </div>
          {mensajeCheckout && <p style={{marginTop: '10px', color: '#10b981'}}>{mensajeCheckout}</p>}
          <button
            className="btn-checkout"
            style={{marginTop: '18px'}}
            disabled={!selectedMetodo || !selectedDireccion}
            onClick={async () => {
              if (!selectedMetodo || !selectedDireccion) return;
              try {
                await apiService.crearPedido(selectedDireccion, selectedMetodo);
                setMensajeCheckout('¡Pedido realizado con éxito!');
                setCartItems([]);
                if (onCartUpdate) onCartUpdate();
                setTimeout(() => {
                  setShowCheckout(false);
                  onClose();
                }, 1500);
              } catch {
                setMensajeCheckout('Error al confirmar el pedido. Intenta de nuevo.');
              }
            }}
          >
            Confirmar y Pagar
          </button>
        </div>
      )}
    </div>
  );
};

ShoppingCart.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  cartUpdated: PropTypes.number,
  onCartUpdate: PropTypes.func,
};
