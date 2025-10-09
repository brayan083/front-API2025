import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { apiService } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export const ShoppingCart = ({ isOpen, onClose, cartUpdated, onCartUpdate }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

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

  // Calcular total según la estructura de tu backend
  const total = cartItems.reduce((sum, item) => {
    // Usar subtotal directamente o calcular precio * cantidad
    const subtotal = parseFloat(item.subtotal || 0);
    return sum + subtotal;
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
            <div className="loading">Cargando...</div>
          ) : cartItems.length === 0 ? (
            <div className="empty-cart">Tu carrito está vacío</div>
          ) : (
            <>
              <div className="cart-items">
                {cartItems.map((item) => (
                  <div key={item.idProducto} className="cart-item">
                    <div className="cart-item-image-container">
                      <img
                        src="/placeholder-product.png"
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
                          className="remove-btn"
                          onClick={() => removeItem(item.idProducto)}
                          aria-label="Eliminar producto"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="cart-footer">
                <div className="cart-summary">
                  <div className="cart-items-count">
                    {cartItems.length} {cartItems.length === 1 ? 'producto' : 'productos'}
                  </div>
                  <div className="cart-total">
                    <span className="total-label">Total:</span>
                    <span className="total-amount">{formatPrice(total)}</span>
                  </div>
                </div>
                <button className="btn-checkout" disabled={cartItems.length === 0}>
                  💳 Proceder al Pago
                </button>
              </div>
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
