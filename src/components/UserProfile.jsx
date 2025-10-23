import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../lib/api";
import "../UserProfile.css";

// --- Helpers (sin cambios) ---
const formatFecha = (fechaISO) => {
  /* ... */
  if (!fechaISO) return "Fecha inválida";
  try {
    const fecha = new Date(fechaISO);
    if (isNaN(fecha.getTime())) {
      return "Fecha inválida";
    }
    return fecha.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch (e) {
    console.error("Error formatting date:", fechaISO, e);
    return "Fecha inválida";
  }
};
const formatPrice = (price) => {
  /* ... */
  const numericPrice = Number(price);
  if (isNaN(numericPrice)) {
    return "$ --.--";
  }
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericPrice);
};

export const UserProfile = () => {
  const { user, loading: authLoading, checkAuthStatus } = useAuth(); // Obtener checkAuthStatus para refrescar datos del user
  const [direcciones, setDirecciones] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const [error, setError] = useState("");
  const [formSuccess, setFormSuccess] = useState(""); // Mensaje genérico de éxito

  // --- Estados Formularios Dirección/Pago (sin cambios) ---
  const [showDireccionForm, setShowDireccionForm] = useState(false);
  const [newDireccion, setNewDireccion] = useState({
    calle: "",
    numero: "",
    ciudad: "",
    cp: "",
  });
  const [showMetodoPagoForm, setShowMetodoPagoForm] = useState(false);
  const [newMetodoPago, setNewMetodoPago] = useState({
    tipo: "",
    proveedor: "",
  });
  const [formLoading, setFormLoading] = useState(false); // Loading genérico para formularios

  // --- NUEVOS ESTADOS: Formulario Editar Perfil ---
  const [showEditProfileForm, setShowEditProfileForm] = useState(false);
  const [profileData, setProfileData] = useState({
    nombre: "",
    apellido: "",
    email: "",
  });

  // --- NUEVOS ESTADOS: Formulario Cambiar Contraseña ---
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    contrasenaActual: "",
    contrasenaNueva: "",
    confirmarContrasena: "",
  });

  // Cargar datos iniciales (perfil, direcciones, métodos, pedidos)
  useEffect(() => {
    const loadProfileData = async () => {
      if (!user) {
        setLoadingData(false);
        setLoadingPedidos(false);
        return;
      }
      setLoadingData(true);
      setLoadingPedidos(true);
      setError("");
      // Pre-rellenar formulario de edición con datos actuales del user
      setProfileData({
        nombre: user.nombre || "",
        apellido: user.apellido || "",
        email: user.email || "",
      });
      try {
        const [direccionesData, metodosPagoData] = await Promise.all([
          apiService.getDirecciones(),
          apiService.getMetodosPago(),
        ]).catch((err) => {
          console.error("Err loading addr/pay:", err);
          setError((prev) => (prev ? prev + " " : "") + "Err dir/pago.");
          return [[], []];
        });
        setDirecciones(direccionesData || []);
        setMetodosPago(metodosPagoData || []);
      } catch (err) {
        console.error("Err basic profile:", err);
        setError((prev) => (prev ? prev + " " : "") + "Err datos básicos.");
      } finally {
        setLoadingData(false);
      }

      try {
        // Obtener todos los pedidos y filtrar por usuario logueado
          const pedidosData = await apiService.getPedidos();
          console.log('Pedidos recibidos:', pedidosData);
          // No hay campo identificador, mostrar todos los pedidos recibidos
          const pedidosArray = pedidosData?.content || pedidosData || [];
          setPedidos(pedidosArray);
      } catch (pedidoErr) {
        console.error("Err history:", pedidoErr);
        setError((prev) => (prev ? prev + " " : "") + "Err historial.");
        setPedidos([]);
      } finally {
        setLoadingPedidos(false);
      }
    };
    if (!authLoading) {
      loadProfileData();
    }
  }, [user, authLoading]);

  // --- Handlers Formularios Dirección/Pago (sin cambios funcionales) ---
  const handleDireccionChange = (e) =>
    setNewDireccion({ ...newDireccion, [e.target.name]: e.target.value });
  const handleAddDireccion = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError("");
    setFormSuccess("");
    try {
      if (
        !newDireccion.calle ||
        !newDireccion.numero ||
        !newDireccion.ciudad ||
        !newDireccion.cp
      )
        throw new Error("Campos obligatorios.");
      const direccionCreada = await apiService.addDireccion(newDireccion);
      setDirecciones((prev) => [...prev, direccionCreada]);
      setNewDireccion({ calle: "", numero: "", ciudad: "", cp: "" });
      setShowDireccionForm(false);
      setFormSuccess("¡Dirección agregada!");
  setTimeout(() => setFormSuccess(""), 3000);
    } catch (err) {
      setError("Error: " + err.message);
    } finally {
      setFormLoading(false);
    }
  };
  const handleMetodoPagoChange = (e) =>
    setNewMetodoPago({ ...newMetodoPago, [e.target.name]: e.target.value });
  const handleAddMetodoPago = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError("");
    setFormSuccess("");
    try {
      if (!newMetodoPago.tipo || !newMetodoPago.proveedor)
        throw new Error("Campos obligatorios.");
      const metodoCreado = await apiService.addMetodoPago(newMetodoPago);
      setMetodosPago((prev) => [...prev, metodoCreado]);
      setNewMetodoPago({ tipo: "", proveedor: "" });
      setShowMetodoPagoForm(false);
      setFormSuccess("¡Método de pago agregado!");
  setTimeout(() => setFormSuccess(""), 3000);
    } catch (err) {
      setError("Error: " + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // --- NUEVO HANDLER: Actualizar Perfil ---
  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError("");
    setFormSuccess("");
    // Filtrar solo los campos que cambiaron respecto al 'user' original para enviar
    const changedData = {};
    if (profileData.nombre !== user.nombre)
      changedData.nombre = profileData.nombre;
    if (profileData.apellido !== user.apellido)
      changedData.apellido = profileData.apellido;
    if (profileData.email !== user.email) changedData.email = profileData.email;

    if (Object.keys(changedData).length === 0) {
      setFormSuccess("No hay cambios para guardar.");
      setShowEditProfileForm(false);
      setFormLoading(false);
      return;
    }

    try {
      await apiService.actualizarPerfil(changedData);
      // Refrescar el estado del usuario en AuthContext
      if (checkAuthStatus) await checkAuthStatus();
      setShowEditProfileForm(false);
      setFormSuccess("¡Perfil actualizado con éxito!");
      setTimeout(() => setFormSuccess(""), 3000);
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Error al actualizar perfil: " + err.message);
      // Revertir cambios locales si falla? Opcional.
      setProfileData({
        nombre: user.nombre || "",
        apellido: user.apellido || "",
        email: user.email || "",
      });
    } finally {
      setFormLoading(false);
    }
  };

  // --- NUEVO HANDLER: Cambiar Contraseña ---
  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setFormSuccess("");
    if (passwordData.contrasenaNueva !== passwordData.confirmarContrasena) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    if (passwordData.contrasenaNueva.length < 6) {
      setError("La contraseña nueva debe tener al menos 6 caracteres.");
      return;
    }
    setFormLoading(true);
    try {
      await apiService.cambiarContrasena(
        passwordData.contrasenaActual,
        passwordData.contrasenaNueva
      );
      setPasswordData({
        contrasenaActual: "",
        contrasenaNueva: "",
        confirmarContrasena: "",
      }); // Limpiar formulario
      setShowChangePasswordForm(false); // Ocultar formulario
      setFormSuccess("¡Contraseña cambiada con éxito!");
      setTimeout(() => setFormSuccess(""), 3000);
    } catch (err) {
      console.error("Error changing password:", err);
      setError("Error al cambiar contraseña: " + err.message); // El backend ya valida la actual
    } finally {
      setFormLoading(false);
    }
  };

  // --- Renderizado ---
  if (authLoading) {
    return <div className="loading">Cargando...</div>;
  }
  if (!user) {
    return (
      <div className="profile-container error-message">
        Debes iniciar sesión.
      </div>
    );
  }

  return (
    <div className="profile-container">
      <h2>Mi Perfil</h2>

      {error && (
        <div className="error-message" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}
      {formSuccess && (
        <div className="success-message" style={{ marginBottom: "1rem" }}>
          {formSuccess}
        </div>
      )}

      {/* --- Sección Información Personal (con botón Editar) --- */}
      <div className="profile-section">
        <div className="section-header">
          <h3>Información Personal</h3>
          <button
            onClick={() => {
              setShowEditProfileForm(!showEditProfileForm);
              setError("");
              setFormSuccess("");
              setProfileData({
                nombre: user.nombre || "",
                apellido: user.apellido || "",
                email: user.email || "",
              });
            }}
            className="btn-edit"
          >
            {showEditProfileForm ? "Cancelar" : "✏️ Editar"}
          </button>
        </div>
        {loadingData ? (
          <p>Cargando...</p>
        ) : !showEditProfileForm ? (
          <>
            <p>
              <strong>Nombre:</strong> {user.nombre || "N/A"}
            </p>
            <p>
              <strong>Apellido:</strong> {user.apellido || "N/A"}
            </p>
            <p>
              <strong>Email:</strong> {user.email || "N/A"}
            </p>
          </>
        ) : (
          <form onSubmit={handleUpdateProfile} className="edit-form">
            <div className="form-grid-condensed">
              <input
                name="nombre"
                value={profileData.nombre}
                onChange={handleProfileChange}
                placeholder="Nombre"
              />
              <input
                name="apellido"
                value={profileData.apellido}
                onChange={handleProfileChange}
                placeholder="Apellido"
              />
              <input
                name="email"
                type="email"
                value={profileData.email}
                onChange={handleProfileChange}
                placeholder="Email"
                required
              />
            </div>
            <button
              type="submit"
              disabled={formLoading}
              className="btn-primary"
            >
              {formLoading ? "Guardando..." : "Guardar Cambios"}
            </button>
          </form>
        )}
      </div>

      {/* --- Sección Cambiar Contraseña --- */}
      <div className="profile-section">
        <div className="section-header">
          <h3>Seguridad</h3>
          <button
            onClick={() => {
              setShowChangePasswordForm(!showChangePasswordForm);
              setError("");
              setFormSuccess("");
              setPasswordData({
                contrasenaActual: "",
                contrasenaNueva: "",
                confirmarContrasena: "",
              });
            }}
            className="btn-edit"
          >
            {showChangePasswordForm ? "Cancelar" : "🔑 Cambiar Contraseña"}
          </button>
        </div>
        {showChangePasswordForm && (
          <form onSubmit={handleChangePassword} className="edit-form">
            <h4>Cambiar Contraseña</h4>
            <div className="form-grid-condensed">
              <input
                name="contrasenaActual"
                type="password"
                value={passwordData.contrasenaActual}
                onChange={handlePasswordChange}
                placeholder="Contraseña Actual"
                required
              />
              <input
                name="contrasenaNueva"
                type="password"
                value={passwordData.contrasenaNueva}
                onChange={handlePasswordChange}
                placeholder="Nueva Contraseña (min. 6)"
                required
                minLength={6}
              />
              <input
                name="confirmarContrasena"
                type="password"
                value={passwordData.confirmarContrasena}
                onChange={handlePasswordChange}
                placeholder="Confirmar Nueva Contraseña"
                required
              />
            </div>
            <button
              type="submit"
              disabled={formLoading}
              className="btn-primary"
            >
              {formLoading ? "Guardando..." : "Actualizar Contraseña"}
            </button>
          </form>
        )}
      </div>

      {/* --- Sección Historial de Pedidos (sin cambios) --- */}
      <div className="profile-section">
        <h3>Historial de Pedidos</h3>
        {loadingPedidos ? (
          <p>Cargando...</p>
        ) : pedidos.length === 0 ? (
          <p>Sin pedidos.</p>
        ) : (
          <ul className="order-history-list">
            {pedidos.map((p) => (
              <li key={p.id} className="order-summary-item">
                <div className="order-summary-header">
                  <span className="order-id">#{p.id}</span>{" "}
                  <span className="order-date">{formatFecha(p.fecha)}</span>
                </div>
                <div className="order-summary-body">
                  <span className="order-status">{p.estado}</span>{" "}
                  <span className="order-items">
                    {p.cantidadItems ?? "?"} items
                  </span>{" "}
                  <span className="order-total">{formatPrice(p.total)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* --- Sección Direcciones (sin cambios) --- */}
      <div className="profile-section">
        <h3>Direcciones de Envío</h3>
        {loadingData ? (
          <p>Cargando...</p>
        ) : direcciones.length === 0 ? (
          <p>Sin direcciones.</p>
        ) : (
          <ul>
            {direcciones.map((d) => (
              <li key={d.id}>
                {d.calle} {d.numero}, {d.ciudad} ({d.cp})
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={() => {
            setShowDireccionForm(!showDireccionForm);
            setError("");
            setFormSuccess("");
          }}
          className="btn-add"
        >
          {" "}
          {showDireccionForm ? "Cancelar" : "➕ Agregar"}{" "}
        </button>
        {showDireccionForm && (
          <form onSubmit={handleAddDireccion} className="add-form">
            <h4>Nueva Dirección</h4>
            <div className="form-grid">
              <input
                name="calle"
                value={newDireccion.calle}
                onChange={handleDireccionChange}
                placeholder="Calle"
                required
              />
              <input
                name="numero"
                value={newDireccion.numero}
                onChange={handleDireccionChange}
                placeholder="Número"
                required
              />
              <input
                name="ciudad"
                value={newDireccion.ciudad}
                onChange={handleDireccionChange}
                placeholder="Ciudad"
                required
              />
              <input
                name="cp"
                value={newDireccion.cp}
                onChange={handleDireccionChange}
                placeholder="C.P."
                required
              />
            </div>
            <button
              type="submit"
              disabled={formLoading}
              className="btn-primary"
            >
              {formLoading ? "Guardando..." : "Guardar"}
            </button>
          </form>
        )}
      </div>

      {/* --- Sección Métodos de Pago (sin cambios) --- */}
      <div className="profile-section">
        <h3>Métodos de Pago</h3>
        {loadingData ? (
          <p>Cargando...</p>
        ) : metodosPago.length === 0 ? (
          <p>Sin métodos.</p>
        ) : (
          <ul>
            {metodosPago.map((m) => (
              <li key={m.id}>
                {m.tipo} - {m.proveedor}
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={() => {
            setShowMetodoPagoForm(!showMetodoPagoForm);
            setError("");
            setFormSuccess("");
          }}
          className="btn-add"
        >
          {" "}
          {showMetodoPagoForm ? "Cancelar" : "💳 Agregar"}{" "}
        </button>
        {showMetodoPagoForm && (
          <form onSubmit={handleAddMetodoPago} className="add-form">
            <h4>Nuevo Método</h4>
            <div className="form-grid-condensed">
              <input
                name="tipo"
                value={newMetodoPago.tipo}
                onChange={handleMetodoPagoChange}
                placeholder="Tipo"
                required
              />
              <input
                name="proveedor"
                value={newMetodoPago.proveedor}
                onChange={handleMetodoPagoChange}
                placeholder="Proveedor"
                required
              />
            </div>
            <button
              type="submit"
              disabled={formLoading}
              className="btn-primary"
            >
              {formLoading ? "Guardando..." : "Guardar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
