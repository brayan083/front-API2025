import { useState, useEffect, useCallback, Suspense } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Auth } from "./components/Auth";
import { Header } from "./components/Header";
import { Home } from "./components/Home";
import { Admin } from "./components/Admin";
import { ProductCatalog } from "./components/ProductCatalog";
import { ShoppingCart } from "./components/ShoppingCart";
import { apiService } from "./lib/api";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import "./App.css";
import { UserProfile } from "./components/UserProfile";

// Layout inteligente que cambia según autenticación
function SmartLayout() {
  const { user } = useAuth();

  // Si hay usuario logueado, usa AppLayout con carrito
  if (user) {
    return <AppLayout />;
  }

  // Si no hay usuario, usa layout público sin carrito
  return (
    <div className="app">
      <Header onCartClick={() => {}} cartItemCount={0} />
      <main className="main-content">
        <Outlet context={{ onAddToCart: null }} />
      </main>
    </div>
  );
}

// Layout principal que incluye el Header y el Carrito
function AppLayout() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [cartUpdated, setCartUpdated] = useState(0);
  const [carrito, setCarrito] = useState([]);
  const { user } = useAuth();

  // Definir updateCartCount primero
  const updateCartCount = useCallback(async () => {
    if (!user) {
      setCartItemCount(0);
      setCarrito([]);
      return;
    }
    try {
      const carritoData = await apiService.getCarrito();
      const items = carritoData?.items || [];
      const total = items.reduce((sum, item) => sum + (item.cantidad || 0), 0);
      setCartItemCount(total);
      setCarrito(items);
    } catch (error) {
      console.error("❌ Error actualizando contador del carrito:", error);
      setCartItemCount(0);
      setCarrito([]);
    }
  }, [user]);

  // Actualizar contador del carrito cuando el usuario cambia
  useEffect(() => {
    updateCartCount();
  }, [updateCartCount]);

  const handleAddToCart = async (product) => {
    try {
      await apiService.agregarAlCarrito(product.id, 1);
      setCartUpdated((prev) => prev + 1);
      await updateCartCount(); // Actualizar carrito y contador
    } catch (error) {
      console.error("❌ Error agregando al carrito:", error);
      alert("Error al agregar al carrito. Inténtalo de nuevo.");
    }
  };

  return (
    <div className="app">
      <Header
        onCartClick={() => setIsCartOpen(true)}
        cartItemCount={cartItemCount}
      />
      <main className="main-content">
        {/* Outlet renderizará el componente de la ruta hija (ProductCatalog) */}
        <Outlet
          context={{
            onAddToCart: handleAddToCart,
            carrito: carrito,
            updateCartCount: updateCartCount,
          }}
        />
      </main>
      <ShoppingCart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartUpdated={cartUpdated}
        onCartUpdate={updateCartCount}
      />
    </div>
  );
}

// // Componente que usa el contexto de Outlet
// function CatalogPage() {
//     const { onAddToCart } = useOutletContext();
//     return <ProductCatalog onAddToCart={onAddToCart} />;
// }

function AppContent() {
  const { loading, user } = useAuth();

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <Routes>
      {/* Rutas públicas con layout inteligente */}
      <Route element={<SmartLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/catalogo" element={<ProductCatalog />} />
        <Route path="/user" element={<UserProfile />} />

        {/* Ruta /admin solo para admins */}
        <Route
          path="/admin"
          element={
            user?.isAdmin ? (
              <Suspense fallback={<div>Cargando admin...</div>}>
                <Admin />
              </Suspense>
            ) : (
              <Navigate to="/" />
            )
          }
        />
      </Route>

      {/* Ruta de login */}
      <Route path="/login" element={user ? <Navigate to="/" /> : <Auth />} />

      {/* Redirección por defecto */}
      <Route path="*" element={<Navigate to="/" />} />
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
