import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

export const Header = ({ onCartClick = () => {}, cartItemCount = 0 }) => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">MusicStore</Link>
        <nav className="nav">
          {/* Navegación siempre visible */}
          <Link to="/" className="nav-link">Inicio</Link>
          <Link to="/catalogo" className="nav-link">Catálogo</Link>
          
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
            <Link to="/login" className="btn-login">
              Iniciar Sesión
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

Header.propTypes = {
  onCartClick: PropTypes.func,
  cartItemCount: PropTypes.number,
};
