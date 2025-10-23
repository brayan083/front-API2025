import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { apiService } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useOutletContext } from 'react-router-dom';

// --- NUEVO COMPONENTE AUXILIAR PARA RENDERIZAR ESTRELLAS ---
const StarRating = ({ rating }) => {
    const totalStars = 5;
    const filledStars = Math.round(rating); // Redondear al entero más cercano
    return (
        <div className="star-rating">
            {[...Array(totalStars)].map((_, index) => (
                <span key={index} className={index < filledStars ? 'star filled' : 'star empty'}>
                    ★
                </span>
            ))}
        </div>
    );
};
StarRating.propTypes = { rating: PropTypes.number.isRequired };
// --- FIN COMPONENTE ESTRELLAS ---

// --- NUEVO HELPER PARA FORMATEAR FECHA ---
const formatFecha = (fechaISO) => {
    if (!fechaISO) return '';
    try {
        return new Date(fechaISO).toLocaleDateString('es-AR', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    } catch { return 'Fecha inválida'; }
};
// --- FIN HELPER FECHA ---

export const ProductCatalog = ({ onAddToCart }) => {
    const navigate = useNavigate();
    const outletContext = useOutletContext() || {};
    const addToCartFunction = onAddToCart || outletContext?.onAddToCart;
    const carrito = outletContext?.carrito || [];

    const formatPrice = (price) => {
        // ... (existing formatPrice function) ...
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS', // Cambiado a ARS
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Number(price) || 0); // Asegurar que sea número
    };

    const isProductInCart = (productoId) => {
        return Array.isArray(carrito) && carrito.some(item =>
            item.id === productoId || item.idProducto === productoId
        );
    };

    const getImageSrc = (imagen) => {
        // ... (existing getImageSrc function) ...
        if (!imagen) return '/placeholder-product.png';
        if (typeof imagen !== 'string') return '/placeholder-product.png';

        const trimmed = imagen.trim();
        if (trimmed.startsWith('data:')) return trimmed;
        if (trimmed.startsWith('http') || trimmed.startsWith('/')) return trimmed;

        const base64Regex = /^[A-Za-z0-9+/=\s]+$/;
        if (base64Regex.test(trimmed) && trimmed.length > 100) {
            let mime = 'image/png';
            if (trimmed.startsWith('/9j')) mime = 'image/jpeg';
            else if (trimmed.startsWith('iVBOR')) mime = 'image/png';
            return `data:${mime};base64,${trimmed}`;
        }
        try {
            const decoded = decodeURIComponent(trimmed);
            if (decoded.startsWith('data:')) return decoded;
        } catch { /* ignore */ }
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

    // --- NUEVOS ESTADOS PARA RESEÑAS ---
    const [reviews, setReviews] = useState({}); // Almacena reseñas por ID de producto
    const [loadingReviews, setLoadingReviews] = useState(null); // ID del producto cuyas reseñas se están cargando
    const [visibleReviewsProductId, setVisibleReviewsProductId] = useState(null); // ID del producto cuyas reseñas están visibles
    const [reviewError, setReviewError] = useState('');
    // --- FIN NUEVOS ESTADOS ---

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchProducts = useCallback(async () => {
        try {
            const filtros = {};
            if (selectedCategory && selectedCategory !== '') filtros.categoria = parseInt(selectedCategory);
            if (selectedMarca && selectedMarca !== '') filtros.marca = parseInt(selectedMarca);

            // Reiniciar reseñas visibles al cambiar filtros
            setVisibleReviewsProductId(null);
            setReviews({}); // Limpiar caché de reseñas

            const productosData = await apiService.getProductos(filtros);
            setProductos(productosData?.content || []);
            setError('');
        } catch (error) {
            // ... (existing error handling) ...
            if (error.message.includes('403')) {
                setError('🚫 Error de permisos al filtrar.');
            } else if (error.message.includes('404')) {
                setError('🔍 No se encontraron productos con esos filtros.');
                setProductos([]); // Asegurar que la lista esté vacía
            } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
                setError('🔌 Error de conexión al filtrar productos.');
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
                apiService.getCategorias(), apiService.getMarcas(), apiService.getProductos()
            ]);
            setCategorias(categoriasData?.content || []);
            setMarcas(marcasData?.content || []);
            setProductos(productosData?.content || []);
            setError('');
        } catch (err) {
            console.error("Error fetching initial data:", err);
            setError('Error al cargar datos iniciales: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCartAction = async (producto) => {
        // ... (existing handleCartAction function, no changes needed here) ...
        if (!user) {
            const shouldLogin = window.confirm('¡Necesitas iniciar sesión para agregar productos al carrito!\n\n¿Quieres ir a la página de login?');
            if (shouldLogin) navigate('/login');
            return;
        }
        const productInCart = isProductInCart(producto.id);
        try {
            if (productInCart) {
                const cartItem = carrito.find(item => item.id === producto.id || item.idProducto === producto.id);
                const productIdToRemove = cartItem?.idProducto || producto.id;
                await apiService.eliminarDelCarrito(productIdToRemove);
            } else {
                await (addToCartFunction ? addToCartFunction(producto) : apiService.agregarAlCarrito(producto.id, 1));
            }
            if (outletContext?.updateCartCount) await outletContext.updateCartCount();
        } catch (err) {
            const action = productInCart ? 'quitar del' : 'agregar al';
            alert(`Error al ${action} carrito: ${err.message}. Inténtalo de nuevo.`);
            // Re-sincronizar por si acaso
            if (outletContext?.updateCartCount) await outletContext.updateCartCount();
        }
    };

    // --- NUEVA FUNCIÓN PARA MANEJAR CLIC EN RESEÑAS ---
    const handleToggleReviews = async (productId) => {
        setReviewError(''); // Limpiar errores previos de reseñas
        if (visibleReviewsProductId === productId) {
            // Si ya están visibles, ocultarlas
            setVisibleReviewsProductId(null);
        } else {
            // Si no están visibles, cargarlas (si no están ya cargadas) y mostrarlas
            if (!reviews[productId]) { // Verificar si ya las tenemos cacheadas
                setLoadingReviews(productId);
                try {
                    const fetchedReviews = await apiService.getProductoReviews(productId);
                    setReviews(prev => ({ ...prev, [productId]: fetchedReviews || [] })); // Guardar reseñas o array vacío
                    setVisibleReviewsProductId(productId); // Mostrar
                } catch (err) {
                    console.error(`Error fetching reviews for product ${productId}:`, err);
                    setReviewError(`No se pudieron cargar las reseñas: ${err.message}`);
                    setReviews(prev => ({ ...prev, [productId]: [] })); // Guardar array vacío en error
                    setVisibleReviewsProductId(productId); // Aún intentar mostrar (mostrará mensaje de error/vacío)
                } finally {
                    setLoadingReviews(null);
                }
            } else {
                // Si ya estaban cacheadas, solo mostrarlas
                setVisibleReviewsProductId(productId);
            }
        }
    };
    // --- FIN FUNCIÓN RESEÑAS ---

    if (loading) return <div className="loading">Cargando catálogo...</div>;
    // Mostrar error principal si existe, ANTES de renderizar el catálogo
    if (error && !productos.length) return <div className="catalog-container"><div className="error-message">{error}</div></div>;


    return (
        <div className="catalog-container">
            <div className="catalog-header">
                <h2>Catálogo de Instrumentos</h2>
                {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>} {/* Mostrar error aquí también si hubo al filtrar */}

                <div className="filters-container">
                    {/* ... (existing filters JSX) ... */}
                    <div className="filters-header">
                        <h3>🔍 Filtrar Productos</h3>
                        {(selectedCategory || selectedMarca) && (
                            <button className="clear-filters-btn" onClick={() => { setSelectedCategory(''); setSelectedMarca(''); }}>
                                🗑️ Limpiar filtros
                            </button>
                        )}
                    </div>
                    <div className="filters-row">
                        <div className="filter-group">
                            <label htmlFor="categoria" className="filter-label">📂 Categoría</label>
                            <select id="categoria" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="filter-select">
                                <option value="">🔘 Todas</option>
                                {Array.isArray(categorias) && categorias.map((cat) => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label htmlFor="marca" className="filter-label">🏷️ Marca</label>
                            <select id="marca" value={selectedMarca} onChange={(e) => setSelectedMarca(e.target.value)} className="filter-select">
                                <option value="">🔘 Todas</option>
                                {Array.isArray(marcas) && marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="products-grid">
                {Array.isArray(productos) && productos.map((producto) => (
                    <div key={producto.id} className="product-card">
                        <div className="product-image-container">
                            <img src={getImageSrc(producto.imagenBase64)} alt={producto.nombre} className="product-image" onError={(e) => { e.target.src = '/placeholder-product.png'; }} />
                            {(!producto.stock || producto.stock === 0) && <div className="out-of-stock-badge">Sin Stock</div>}
                        </div>

                        <div className="product-content">
                            {/* ... (existing product details) ... */}
                            <div className="product-header">
                                <h3 className="product-title">{producto.nombre}</h3>
                                <div className="product-price">{formatPrice(producto.precio || 0)}</div>
                            </div>
                            <p className="product-description">{producto.descripcion}</p>
                            <div className="product-details">
                                <div className="product-meta">
                                    <span className="product-category"><span className="meta-label">📂</span>{producto.categoriaNombre || 'N/A'}</span>
                                    <span className="product-brand"><span className="meta-label">🏷️</span>{producto.marcaNombre || 'N/A'}</span>
                                </div>
                                <div className="product-stock">
                                    <span className="stock-indicator">{producto.stock > 0 ? '✅' : '❌'}</span>
                                    <span className="stock-text">{producto.stock > 0 ? `${producto.stock} disponibles` : 'Agotado'}</span>
                                </div>
                            </div>

                            <div className="product-actions">
                                {/* ... (existing add to cart button logic) ... */}
                                {user ? (
                                    <button
                                        className={`btn-add-to-cart ${(!producto.stock || producto.stock === 0) ? 'disabled' : isProductInCart(producto.id) ? 'in-cart' : 'available'}`}
                                        onClick={() => handleCartAction(producto)}
                                        disabled={!producto.stock || producto.stock === 0}
                                    >
                                        {(!producto.stock || producto.stock === 0) ? '❌ Sin Stock' : isProductInCart(producto.id) ? '🗑️ Quitar' : '🛒 Agregar'}
                                    </button>
                                ) : (
                                    <div className="login-prompt" onClick={() => navigate('/login')}>
                                        <span>🔒 Inicia sesión</span>
                                    </div>
                                )}
                            </div>

                            {/* --- BOTÓN Y SECCIÓN DE RESEÑAS --- */}
                            <div className="reviews-section-toggle">
                                <button
                                    className="btn-toggle-reviews"
                                    onClick={() => handleToggleReviews(producto.id)}
                                    disabled={loadingReviews === producto.id} // Deshabilitar mientras carga ESTE producto
                                >
                                    {loadingReviews === producto.id ? 'Cargando...' : (visibleReviewsProductId === producto.id ? '➖ Ocultar Reseñas' : '➕ Ver Reseñas')}
                                </button>
                            </div>

                            {visibleReviewsProductId === producto.id && (
                                <div className="reviews-list-container">
                                    <h4>Reseñas</h4>
                                    {reviewError && <p className="error-message">{reviewError}</p>}
                                    {/* Mostrar reseñas cacheadas O mensaje de "no hay" / "cargando" */}
                                    {!reviewError && loadingReviews !== producto.id && (!reviews[producto.id] || reviews[producto.id].length === 0) && (
                                        <p className="no-reviews-message">Aún no hay reseñas para este producto.</p>
                                    )}
                                    {!reviewError && loadingReviews !== producto.id && reviews[producto.id] && reviews[producto.id].length > 0 && (
                                        <ul className="reviews-list">
                                            {reviews[producto.id].map(review => (
                                                <li key={review.id} className="review-item">
                                                    <div className="review-header">
                                                        <span className="review-author">{review.nombreUsuario || 'Anónimo'}</span>
                                                        <StarRating rating={review.calificacion} />
                                                    </div>
                                                    <p className="review-comment">{review.comentario || 'Sin comentario.'}</p>
                                                    <span className="review-date">{formatFecha(review.fecha)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {loadingReviews === producto.id && <p>Cargando reseñas...</p> /* Mensaje de carga específico */}
                                </div>
                            )}
                            {/* --- FIN SECCIÓN RESEÑAS --- */}
                        </div>
                    </div>
                ))}
            </div>

            {Array.isArray(productos) && productos.length === 0 && !loading && ( // Asegurar que no esté cargando
                <div className="no-products">
                    <p>No se encontraron productos con los filtros seleccionados.</p>
                </div>
            )}
        </div>
    );
};

ProductCatalog.propTypes = {
    onAddToCart: PropTypes.func,
};
