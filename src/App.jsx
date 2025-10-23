import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { Header } from './components/Header';
import { Home } from './components/Home';
import { ProductCatalog } from './components/ProductCatalog';
import { ShoppingCart } from './components/ShoppingCart';
import { UserProfile } from './components/UserProfile';
import { apiService } from './lib/api';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import './App.css';
import PropTypes from 'prop-types';

// Wrapper para rutas protegidas (solo verifica si hay usuario)
function ProtectedElement({ children }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="loading">Verificando autenticación...</div>;
    }

    return user ? children : <Navigate to="/login" state={{ from: location }} replace />;
}
ProtectedElement.propTypes = { children: PropTypes.node.isRequired };


// Layout principal para usuarios logueados (CON CARRITO Y CONTEXTO)
function AppLayout() {
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [cartItemCount, setCartItemCount] = useState(0);
    const [cartUpdated, setCartUpdated] = useState(0); // Trigger para refrescar carrito
    const [carrito, setCarrito] = useState([]);
    // useAuth() funciona aquí porque AppLayout SIEMPRE es renderizado por SmartLayout cuando hay usuario
    const { user } = useAuth();

    const updateCartCount = useCallback(async () => {
        // No necesitamos chequear 'user' aquí
        try {
            const carritoData = await apiService.getCarrito();
            const items = carritoData?.items || [];
            const total = items.reduce((sum, item) => sum + (item.cantidad || 0), 0);
            setCartItemCount(total);
            setCarrito(items); // Guardar los items completos
        } catch (error) {
            console.error('❌ Error actualizando contador del carrito:', error);
            if (!error.message.includes('401')) { /* No mostrar error si es solo deslogueo */ }
            setCartItemCount(0);
            setCarrito([]);
        }
    }, []); // Sin dependencias, ya que 'user' está garantizado

    // Cargar carrito al montar y cuando cartUpdated cambie
    useEffect(() => {
        updateCartCount();
    }, [updateCartCount, cartUpdated]); // Depender de cartUpdated para forzar recarga

    const handleAddToCart = useCallback(async (product) => {
        try {
            await apiService.agregarAlCarrito(product.id, 1);
            // Actualizar el estado local Y el contador del header
            await updateCartCount();
            // Forzar refresco del ShoppingCart si está abierto
            setCartUpdated(prev => prev + 1);
        } catch (error) {
            console.error('❌ Error agregando al carrito:', error);
            alert('Error al agregar al carrito. Inténtalo de nuevo.');
        }
    }, [updateCartCount]);

    // Contexto a pasar a las rutas hijas (Outlet)
    const outletContextValue = {
        onAddToCart: handleAddToCart,
        carrito: carrito,
        updateCartCount: updateCartCount
    };

    return (
        <div className="app">
            <Header
                onCartClick={() => setIsCartOpen(true)}
                cartItemCount={cartItemCount}
            />
            <main className="main-content">
                {/* Outlet pasa el contexto correcto a Catálogo y Perfil */}
                <Outlet context={outletContextValue} />
            </main>
            <ShoppingCart
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                cartUpdated={cartUpdated} // Para que sepa cuándo recargar
                onCartUpdate={updateCartCount} // Para actualizar el header desde el carrito
            />
        </div>
    );
}

// Layout simple para vistas públicas (SIN CARRITO NI CONTEXTO REAL)
function PublicLayout() {
    // Función dummy para pasar al contexto si es necesario
    const dummyUpdateCart = () => {};
    const dummyAddToCart = () => {
        // Podríamos mostrar el prompt de login aquí si quisiéramos
        alert("Inicia sesión para agregar productos al carrito.");
    };

    return (
        <div className="app">
            {/* Header simple sin contador real ni acción de carrito */}
            <Header onCartClick={() => alert("Inicia sesión para ver tu carrito.")} cartItemCount={0} />
            <main className="main-content">
                {/* Pasar contexto dummy o nulo */}
                <Outlet context={{ onAddToCart: dummyAddToCart, carrito: [], updateCartCount: dummyUpdateCart }} />
            </main>
        </div>
    );
}

// *** SmartLayout: Decide qué Layout usar ***
function SmartLayout() {
    const { user, loading } = useAuth();

    if (loading) {
        // Muestra carga mientras se verifica el usuario
        return <div className="loading">Cargando...</div>;
    }

    // Si hay usuario, usa AppLayout (con carrito y contexto real)
    // Si no hay usuario, usa PublicLayout (sin carrito funcional)
    return user ? <AppLayout /> : <PublicLayout />;
}


// Componente principal que define las rutas
function AppContent() {
    const { loading, user } = useAuth(); // Usar loading aquí para evitar render inicial incorrecto

    if (loading) {
        return <div className="loading">Cargando aplicación...</div>; // Esperar a que se determine el estado de auth
    }

    return (
        <Routes>
            {/* Rutas que usan SmartLayout (Home, Catálogo) */}
            <Route element={<SmartLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/catalogo" element={<ProductCatalog />} />
                {/* La ruta Perfil ahora DEBE estar aquí DENTRO de SmartLayout */}
                {/* Usamos ProtectedElement para asegurarnos que solo se acceda logueado */}
                <Route path="/perfil" element={
                    <ProtectedElement>
                        <UserProfile />
                    </ProtectedElement>
                } />
            </Route>

            {/* Ruta de Login (fuera de SmartLayout) */}
            {/* Redirige si el usuario ya está logueado */}
            <Route path="/login" element={user ? <Navigate to="/catalogo" replace /> : <Auth />} />

            {/* Redirección por defecto */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;