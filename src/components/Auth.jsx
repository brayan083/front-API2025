import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { error, data } = isLogin
        ? await signIn(email, password)
        : await signUp(nombre, apellido, email, password);

      if (error) {
        setError(error.message);
      } else if (!isLogin) {
        // Si fue un registro exitoso
        console.log('🎉 Registro exitoso! Data recibida:', data);
        
        // Si el backend devuelve token/user, el AuthContext manejará el auto-login
        if (data?.token || data?.user) {
          setSuccess('¡Registro exitoso! Entrando a la aplicación...');
          // Limpiar formulario
          setEmail('');
          setPassword('');
          setNombre('');
          setApellido('');
        } else {
          // Si no hay token, mostrar mensaje y cambiar a login
          setSuccess('¡Registro exitoso! Ahora puedes iniciar sesión.');
          setTimeout(() => {
            setIsLogin(true);
            setSuccess('');
          }, 2000);
        }
      } else {
        // Login exitoso
        console.log('✅ Login exitoso');
      }
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isLogin ? 'Iniciar Sesión' : 'Registrarse'}</h2>
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="form-group">
                <label htmlFor="nombre">Nombre</label>
                <input
                  id="nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required={!isLogin}
                  placeholder="Tu nombre"
                />
              </div>
              <div className="form-group">
                <label htmlFor="apellido">Apellido</label>
                <input
                  id="apellido"
                  type="text"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  required={!isLogin}
                  placeholder="Tu apellido"
                />
              </div>
            </>
          )}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Cargando...' : isLogin ? 'Iniciar Sesión' : 'Registrarse'}
          </button>
        </form>
        <button
          className="btn-link"
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
            setSuccess('');
            // Limpiar todos los campos al cambiar de modo
            setEmail('');
            setPassword('');
            setNombre('');
            setApellido('');
          }}
        >
          {isLogin
            ? '¿No tienes cuenta? Regístrate'
            : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </div>
    </div>
  );
};
