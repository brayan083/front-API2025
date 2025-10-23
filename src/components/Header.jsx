import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom'; // Importar useNavigate
import PropTypes from 'prop-types';

export const Header = ({ onCartClick = () => {}, cartItemCount = 0 }) => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate(); // Hook para navegar

    const handleSignOut = async () => {
        await signOut();
        navigate('/'); // Redirigir a Home después de cerrar sesión
    };

    return (
        <header className="header">
            <div className="header-container">
                <Link to="/" className="logo">MusicStore</Link>
                <nav className="nav">
                    <Link to="/" className="nav-link">Inicio</Link>
                    <Link to="/catalogo" className="nav-link">Catálogo</Link>

                    {user ? (
                        <>
                            {/* Enlace al Perfil */}
                            <Link to="/perfil" className="nav-link">Mi Perfil</Link>

                            {/* Mostrar email si está disponible en user */}
                            {user.email && <span className="user-email">{user.email}</span>}

                            <button className="cart-btn" onClick={onCartClick}>
                                🛒 Carrito {cartItemCount > 0 && `(${cartItemCount})`}
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
