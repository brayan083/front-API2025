import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { Header } from './components/Header';
import { ProductCatalog } from './components/ProductCatalog';
import { ShoppingCart } from './components/ShoppingCart';
import { supabase } from './lib/supabase';
import './App.css';

function AppContent() {
  const { user, loading } = useAuth();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [cartUpdated, setCartUpdated] = useState(0);

  const handleAddToCart = async (product) => {
    try {
      const { data: existingItem, error: fetchError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingItem) {
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert([
            {
              user_id: user.id,
              product_id: product.id,
              quantity: 1,
            },
          ]);

        if (insertError) throw insertError;
      }

      setCartUpdated((prev) => prev + 1);
      updateCartCount();
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Error al agregar al carrito');
    }
  };

  const updateCartCount = async () => {
    if (!user) {
      setCartItemCount(0);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('quantity')
        .eq('user_id', user.id);

      if (error) throw error;

      const total = data.reduce((sum, item) => sum + item.quantity, 0);
      setCartItemCount(total);
    } catch (error) {
      console.error('Error updating cart count:', error);
    }
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  if (!user) {
    return (
      <div className="app">
        <Header onCartClick={() => {}} cartItemCount={0} />
        <Auth />
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        onCartClick={() => setIsCartOpen(true)}
        cartItemCount={cartItemCount}
      />
      <main className="main-content">
        <ProductCatalog onAddToCart={handleAddToCart} />
      </main>
      <ShoppingCart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartUpdated={cartUpdated}
      />
    </div>
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
