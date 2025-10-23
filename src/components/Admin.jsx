import { useState, useEffect } from "react";
import { apiService } from "../lib/api";
import { EditProduct } from "./EditProduct";
import "./Admin.css";

export const Admin = () => {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [marcaId, setMarcaId] = useState("");
  const [imagen, setImagen] = useState("");
  const [imgPreview, setImgPreview] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [editId, setEditId] = useState(null);
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [nuevaMarca, setNuevaMarca] = useState("");
  const [mensajeCatMarca, setMensajeCatMarca] = useState("");
  const [pedidos, setPedidos] = useState([]);
  console.log('Pedidos en Admin:', pedidos);
  const [loadingPedidos, setLoadingPedidos] = useState(false);

  useEffect(() => {
    apiService.getCategorias().then((data) => {
      setCategorias(data.content || []);
    });
    apiService.getMarcas().then((data) => {
      setMarcas(data.content || []);
    });
    apiService.getProductos().then((data) => {
      setProductos(data.content || []);
    });
      // Obtener pedidos
      setLoadingPedidos(true);
      apiService.getPedidosAdmin().then((data) => {
        setPedidos(data.content || data || []);
        setLoadingPedidos(false);
      }).catch(() => setLoadingPedidos(false));
  }, []);

  const handleEditSuccess = () => {
    setEditId(null);
    apiService.getProductos().then((data) => {
      setProductos(data.content || []);
    });
    setMensaje("Producto actualizado correctamente");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje("");
    try {
      const producto = {
        nombre,
        descripcion,
        precio: parseFloat(precio),
        stock: parseInt(stock),
        categoriaId: parseInt(categoriaId),
        marcaId: parseInt(marcaId),
        imagen: imagen.startsWith("data:image/png;base64,")
          ? imagen.replace("data:image/png;base64,", "")
          : imagen,
      };
      const res = await apiService.createProduct(producto);
      if (res) {
        setMensaje("Producto creado correctamente");
      } else {
        setMensaje("Error al crear el producto: " + (res.error || "Desconocido"));
      }
      setNombre("");
      setDescripcion("");
      setPrecio("");
      setStock("");
      setCategoriaId("");
      setMarcaId("");
      setImagen("");
      setImgPreview(null);
    } catch (error) {
      setMensaje("Error al crear el producto", error);
    } finally {
      setLoading(false);
    }
  };

  // Crear categoría
  const handleCrearCategoria = async (e) => {
    e.preventDefault();
    if (!nuevaCategoria.trim()) return;
    const ok = await apiService.createCategoria(nuevaCategoria);
    if (ok) {
      setMensajeCatMarca('Categoría creada correctamente');
      setNuevaCategoria("");
      apiService.getCategorias().then(data => {
        setCategorias(data.content || []);
      });
    } else {
      setMensajeCatMarca('Error al crear la categoría');
    }
  };

  // Crear marca
  const handleCrearMarca = async (e) => {
    e.preventDefault();
    if (!nuevaMarca.trim()) return;
    const ok = await apiService.createMarca(nuevaMarca);
    if (ok) {
      setMensajeCatMarca('Marca creada correctamente');
      setNuevaMarca("");
      apiService.getMarcas().then(data => {
        setMarcas(data.content || []);
      });
    } else {
      setMensajeCatMarca('Error al crear la marca');
    }
  };


  return (
    <>
      <div className="admin-page" style={{display: 'flex', gap: '32px', alignItems: 'flex-start', justifyContent: 'center'}}>
        <div style={{flex: 1, minWidth: 320}}>
          <h2 style={{textAlign: 'left', marginLeft: '8px', marginBottom: '24px'}}>Crear Producto</h2>
          <form className="admin-form" onSubmit={handleSubmit}>
            {/* ...existing code... */}
            <input
              type="text"
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
            <textarea
              placeholder="Descripción"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              required
            />
            <input
              type="number"
              placeholder="Precio"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              required
            />
            <input
              type="number"
              placeholder="Stock"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required
            />
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              required
            >
              <option value="">Selecciona una categoría</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>
            <select
              value={marcaId}
              onChange={(e) => setMarcaId(e.target.value)}
              required
            >
              <option value="">Selecciona una marca</option>
              {marcas.map((marca) => (
                <option key={marca.id} value={marca.id}>
                  {marca.nombre}
                </option>
              ))}
            </select>
            <input
              type="file"
              accept="image/png"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (file && file.type === "image/png") {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setImagen(reader.result);
                    setImgPreview(reader.result);
                  };
                  reader.readAsDataURL(file);
                } else {
                  setImagen("");
                  setImgPreview(null);
                  alert("Solo se permiten imágenes PNG");
                }
              }}
            />
            {imgPreview && (
              <img
                src={imgPreview}
                alt="Vista previa"
                style={{ maxWidth: "120px", margin: "10px auto" }}
              />
            )}
            <button type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear Producto"}
            </button>
          </form>
          {mensaje && <p className="admin-message">{mensaje}</p>}
        </div>
        <div style={{flex: 0.7, minWidth: 220, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <h2 style={{textAlign: 'center', marginBottom: '18px'}}>Crear Categoría / Marca</h2>
          <form className="admin-form" style={{marginBottom: '16px'}} onSubmit={handleCrearCategoria}>
            <input
              type="text"
              placeholder="Nueva categoría"
              value={nuevaCategoria}
              onChange={e => setNuevaCategoria(e.target.value)}
              required
            />
            <button type="submit" style={{background: '#2563eb', color: '#fff'}}>Crear Categoría</button>
          </form>
          <form className="admin-form" onSubmit={handleCrearMarca}>
            <input
              type="text"
              placeholder="Nueva marca"
              value={nuevaMarca}
              onChange={e => setNuevaMarca(e.target.value)}
              required
            />
            <button type="submit" style={{background: '#2563eb', color: '#fff'}}>Crear Marca</button>
          </form>
          {mensajeCatMarca && <p className="admin-message">{mensajeCatMarca}</p>}
        </div>
        <div className="admin-list" style={{flex: 1, minWidth: 320}}>
          <h2>Lista de Productos</h2>
          <ul>
            {productos.map(prod => (
              <li key={prod.id} className="admin-product-card">
                <div>
                  <span className="prod-name">{prod.nombre}</span>
                  <span className="prod-id">(ID: {prod.id})</span>
                </div>
                <div style={{marginTop: '8px'}}>
                  <button className="btn-edit" onClick={() => setEditId(prod.id)}>
                    Editar
                  </button>
                  <button className="btn-delete" onClick={async () => {
                    if (window.confirm('¿Seguro que deseas eliminar este producto?')) {
                      const ok = await apiService.deleteProduct(prod.id);
                      if (ok) {
                        setProductos(productos.filter(p => p.id !== prod.id));
                        setMensaje('Producto eliminado correctamente');
                      } else {
                        setMensaje('Error al eliminar el producto');
                      }
                    }
                  }}>
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {editId && (
            <div className="admin-edit-modal">
              <div style={{position: 'relative'}}>
                <button
                  style={{position: 'absolute', top: 12, right: 12, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 20, cursor: 'pointer', zIndex: 2}}
                  onClick={() => setEditId(null)}
                  aria-label="Cerrar"
                >
                  ×
                </button>
                <EditProduct productId={editId} onEditSuccess={handleEditSuccess} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sección de pedidos en recuadro blanco aparte */}
      <div className="admin-list" style={{maxWidth: 1100, margin: '40px auto 0 auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px #0001', padding: '32px 32px 24px 32px'}}>
        <h2 style={{marginBottom: 24}}>Pedidos Disponibles</h2>
        {loadingPedidos ? (
          <div>Cargando pedidos...</div>
        ) : pedidos.length === 0 ? (
          <div>No hay pedidos disponibles.</div>
        ) : (
          <ul>
            {pedidos.map(ped => (
              <li key={ped.id} className="admin-product-card" style={{marginBottom: 16}}>
                <div>
                  <span><b>ID Pedido:</b> {ped.id}</span><br/>
                  <span><b>ID Usuario:</b> {ped.usuarioId}</span><br/>
                  <span><b>Usuario:</b> {ped.usuarioApellido || 'N/A'}</span><br/>
                  <span><b>usuarioEmail:</b> {ped.usuarioEmail}</span><br/>
                  <span><b>total:</b> {ped.total}</span><br/>
                  <span><b>Estado:</b> {ped.estado || 'Pendiente'}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};
