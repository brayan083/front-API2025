import { useState, useEffect } from "react";
import { apiService } from "../lib/api";
import "./Admin.css";

import PropTypes from "prop-types";


export const EditProduct = ({ productId, onEditSuccess }) => {
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

  useEffect(() => {
    apiService.getCategorias().then((data) => {
      setCategorias(data.content || []);
    });
    apiService.getMarcas().then((data) => {
      setMarcas(data.content || []);
    });
    apiService.getProducto(productId).then((data) => {
      setNombre(data.nombre || "");
      setDescripcion(data.descripcion || "");
      setPrecio(data.precio || "");
      setStock(data.stock || "");
      setCategoriaId(data.categoriaId || "");
      setMarcaId(data.marcaId || "");
      setImagen(data.imagen || "");
      setImgPreview(
        data.imagen ? `data:image/png;base64,${data.imagen}` : null
      );
    });
  }, [productId]);

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
      const res = await apiService.updateProduct(productId, producto);
      if (res) {
        setMensaje("Producto actualizado correctamente");
        if (onEditSuccess) onEditSuccess();
      } else {
        setMensaje("Error al actualizar el producto");
      }
    } catch (error) {
      setMensaje("Error al actualizar el producto", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <h2>Editar Producto</h2>
      <form className="admin-form" onSubmit={handleSubmit}>
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
          {loading ? "Actualizando..." : "Actualizar Producto"}
        </button>
      </form>
      {mensaje && <p className="admin-message">{mensaje}</p>}
    </div>
  );
};


EditProduct.propTypes = {
  productId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onEditSuccess: PropTypes.func,
};