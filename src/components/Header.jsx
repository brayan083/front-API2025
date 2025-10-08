import { useAuth } from '../contexts/AuthContext';

export const Header = ({ onCartClick, cartItemCount }) => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="header">
      <div className="header-container">
        <h1 className="logo">MusicStore</h1>
        <nav className="nav">
          {user ? (
            <>
              <span className="user-email">{user.email}</span>
              <button className="cart-btn" onClick={onCartClick}>
                Carrito {cartItemCount > 0 && `(${cartItemCount})`}
              </button>
              <button className="btn-logout" onClick={handleSignOut}>
                Cerrar Sesión
              </button>
            </>
          ) : (
            <span className="guest-text">Inicia sesión para comprar</span>
          )}
        </nav>
      </div>
    </header>
  );
};
