import { Link } from 'react-router-dom';

export const Home = () => {
  return (
    <div className="home">
      <div className="hero-section">
        <h2>Bienvenido a MusicStore</h2>
        <p>Descubre los mejores instrumentos musicales al mejor precio</p>
        <div className="hero-actions">
          <Link to="/catalogo" className="btn-primary">Ver Catálogo</Link>
        </div>
      </div>
      
      <div className="features">
        <div className="feature">
          <h3>🎸 Instrumentos de Calidad</h3>
          <p>Guitarras, bajos, teclados y más</p>
        </div>
        <div className="feature">
          <h3>🚚 Envío Gratuito</h3>
          <p>En compras mayores a $500</p>
        </div>
        <div className="feature">
          <h3>🔒 Compra Segura</h3>
          <p>Pagos seguros y confiables</p>
        </div>
      </div>
    </div>
  );
};