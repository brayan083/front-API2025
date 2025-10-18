import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { apiService } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useOutletContext } from 'react-router-dom';

export const ProductCatalog = ({ onAddToCart }) => {
  const navigate = useNavigate();
  
  // Obtener contexto del outlet de manera segura
  const outletContext = useOutletContext() || {};
  
  // Usar onAddToCart del contexto si no se pasa como prop
  const addToCartFunction = onAddToCart || outletContext?.onAddToCart;
  
  // Obtener carrito del contexto para verificar productos
  const carrito = outletContext?.carrito || [];

  // Función helper para formatear precios (igual que en ShoppingCart)
  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  // Función para verificar si un producto está en el carrito
  const isProductInCart = (productoId) => {
    return Array.isArray(carrito) && carrito.some(item => 
      item.id === productoId || item.idProducto === productoId
    );
  };
  
  // Helper para normalizar/decodificar imágenes
  // - acepta: data URLs (se devuelven tal cual), URLs absolutas/relativas, o base64 puro
  // - detecta heurísticamente JPEG/PNG por prefijo base64 y construye data URL
  const getImageSrc = (imagen) => {
    if (!imagen) return '/placeholder-product.png';
    if (typeof imagen !== 'string') return '/placeholder-product.png';

    const trimmed = imagen.trim();

    // Si ya es una data URL la devolvemos
    if (trimmed.startsWith('data:')) return trimmed;

    // Si es una URL absoluta o relativa
    if (trimmed.startsWith('http') || trimmed.startsWith('/')) return trimmed;

    // Heurística para detectar base64 "puro": solo caracteres base64 y longitud razonable
    const base64Regex = /^[A-Za-z0-9+/=\s]+$/;
    if (base64Regex.test(trimmed) && trimmed.length > 100) {
      // Detectar tipo por prefijo base64 común
      let mime = 'image/png';
      if (trimmed.startsWith('/9j')) mime = 'image/jpeg'; // JPEG suele empezar con /9j
      else if (trimmed.startsWith('iVBOR')) mime = 'image/png'; // PNG suele empezar con iVBOR

      return `data:${mime};base64,${trimmed}`;
    }

    // Intentar decodificar URI (por si se envió encodeURIComponent de una data URL)
    try {
      const decoded = decodeURIComponent(trimmed);
      if (decoded.startsWith('data:')) return decoded;
    } catch {
      console('no decodifique')
      // ignore
    }

    // Fallback
    return '/placeholder-product.png';
  };
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMarca, setSelectedMarca] = useState('');
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const filtros = {};
      
      // Enviar solo si hay un valor seleccionado y no es la opción por defecto
      if (selectedCategory && selectedCategory !== '') {
        filtros.categoria = parseInt(selectedCategory); // Convertir a número
      }
      if (selectedMarca && selectedMarca !== '') {
        filtros.marca = parseInt(selectedMarca); // Convertir a número
      }
      
      const productosData = await apiService.getProductos(filtros);
      
      setProductos(productosData?.content || []);
      setError(''); // Limpiar error si la consulta es exitosa
      
    } catch (error) {
      // Manejar diferentes tipos de errores
      if (error.message.includes('403')) {
        setError('🚫 Error de permisos al filtrar. Verifica que el backend permita filtros sin autenticación o que estés logueado.');
      } else if (error.message.includes('404')) {
        setError('🔍 No se encontraron productos con esos filtros.');
      } else if (error.message.includes('Failed to fetch')) {
        setError('🔌 Error de conexión al filtrar productos. Verifica que el backend esté funcionando.');
      } else {
        setError(`❌ Error al filtrar: ${error.message}`);
      }
    }
  }, [selectedCategory, selectedMarca]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      const [categoriasData, marcasData, productosData] = await Promise.all([
        apiService.getCategorias(),
        apiService.getMarcas(),
        apiService.getProductos()
      ]);
      console.log('productosData:', productosData);

      setCategorias(categoriasData?.content || []);
      setMarcas(marcasData?.content || []);
      setProductos(productosData?.content || []);
      
    } catch {
      setError('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleCartAction = async (producto) => {
    if (!user) {
      const shouldLogin = window.confirm(
        '¡Necesitas iniciar sesión para agregar productos al carrito!\n\n¿Quieres ir a la página de login?'
      );
      if (shouldLogin) {
        navigate('/login');
      }
      return;
    }

    const productInCart = isProductInCart(producto.id);

    try {
      if (productInCart) {
        // Si el producto ya está en el carrito, quitarlo
        const cartItem = carrito.find(item => 
          item.id === producto.id || item.idProducto === producto.id
        );
        const productIdToRemove = cartItem?.idProducto || producto.id;
        
        await apiService.eliminarDelCarrito(productIdToRemove);
      } else {
        // Si no está en el carrito, agregarlo
        if (addToCartFunction) {
          await addToCartFunction(producto);
        } else {
          await apiService.agregarAlCarrito(producto.id, 1);
        }
      }
      
      // Actualizar el carrito después de cualquier operación
      if (outletContext?.updateCartCount) {
        await outletContext.updateCartCount();
      }
      
    } catch {
      const action = productInCart ? 'quitar del' : 'agregar al';
      alert(`Error al ${action} carrito. Inténtalo de nuevo.`);
    }
  };

  if (loading) return <div className="loading">Cargando catálogo...</div>;
  if (error) return <div className="catalog-container"><div className="error-message">{error}</div></div>;

  return (
    <div className="catalog-container">
      <div className="catalog-header">
        <h2>Catálogo de Instrumentos</h2>
        
        <div className="filters-container">
          <div className="filters-header">
            <h3>🔍 Filtrar Productos</h3>
            {(selectedCategory || selectedMarca) && (
              <button 
                className="clear-filters-btn"
                onClick={() => {
                  setSelectedCategory('');
                  setSelectedMarca('');
                }}
              >
                🗑️ Limpiar filtros
              </button>
            )}
          </div>
          
          <div className="filters-row">
            <div className="filter-group">
              <label htmlFor="categoria" className="filter-label">
                📂 Categoría
              </label>
              <select 
                id="categoria"
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="filter-select"
              >
                <option value="">🔘 Todas las categorías</option>
                {Array.isArray(categorias) && categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label htmlFor="marca" className="filter-label">
                🏷️ Marca
              </label>
              <select 
                id="marca"
                value={selectedMarca} 
                onChange={(e) => setSelectedMarca(e.target.value)}
                className="filter-select"
              >
                <option value="">🔘 Todas las marcas</option>
                {Array.isArray(marcas) && marcas.map((marca) => (
                  <option key={marca.id} value={marca.id}>
                    {marca.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="products-grid">
        {Array.isArray(productos) && productos.map((producto) => (
          <div key={producto.id} className="product-card">
            <div className="product-image-container">
              <img 
                src={getImageSrc(producto.imagenBase64)} 
                alt={producto.nombre}
                className="product-image"
                onError={(e) => { e.target.src = '/placeholder-product.png'; }}
              />
              {(!producto.stock || producto.stock === 0) && (
                <div className="out-of-stock-badge">Sin Stock</div>
              )}
            </div>
            
            <div className="product-content">
              <div className="product-header">
                <h3 className="product-title">{producto.nombre}</h3>
                <div className="product-price">
                  {formatPrice(producto.precio || 0)}
                </div>
              </div>
              
              <p className="product-description">{producto.descripcion}</p>
              
              <div className="product-details">
                <div className="product-meta">
                  <span className="product-category">
                    <span className="meta-label">📂</span>
                    {producto.categoriaNombre || 'N/A'}
                  </span>
                  <span className="product-brand">
                    <span className="meta-label">🏷️</span>
                    {producto.marcaNombre || 'N/A'}
                  </span>
                </div>
                
                <div className="product-stock">
                  <span className="stock-indicator">
                    {producto.stock > 0 ? '✅' : '❌'}
                  </span>
                  <span className="stock-text">
                    {producto.stock > 0 ? `${producto.stock} disponibles` : 'Agotado'}
                  </span>
                </div>
              </div>
              
              <div className="product-actions">
                {user ? (
                  <button
                    className={`btn-add-to-cart ${
                      (!producto.stock || producto.stock === 0) ? 'disabled' : 
                      isProductInCart(producto.id) ? 'in-cart' : 'available'
                    }`}
                    onClick={() => handleCartAction(producto)}
                    disabled={!producto.stock || producto.stock === 0}
                  >
                    {(!producto.stock || producto.stock === 0) ? 
                      '❌ Sin Stock' : 
                      isProductInCart(producto.id) ? 
                        '🗑️ Quitar del Carrito' : 
                        '🛒 Agregar al Carrito'
                    }
                  </button>
                ) : (
                  <div className="login-prompt">
                    <span>🔒 Inicia sesión para comprar</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {Array.isArray(productos) && productos.length === 0 && (
        <div className="no-products">
          <p>No hay productos disponibles.</p>
        </div>
      )}
    </div>
  );
};

ProductCatalog.propTypes = {
  onAddToCart: PropTypes.func,
};
