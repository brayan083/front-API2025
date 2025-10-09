# 🎸 React Instrument E-commerce

Una aplicación de comercio electrónico moderna para instrumentos musicales, construida con React y Vite.

## 🚀 Características

- **Catálogo de Productos**: Explora una amplia gama de instrumentos musicales
- **Carrito de Compras**: Añade y gestiona productos en tu carrito
- **Autenticación de Usuarios**: Sistema completo de login y registro
- **Interfaz Responsiva**: Diseño adaptable para todos los dispositivos
- **API Integration**: Conectado con backend para gestión de datos

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 18 + Vite
- **Routing**: React Router
- **State Management**: Context API
- **Styling**: CSS3 + CSS Modules
- **Build Tool**: Vite
- **Linting**: ESLint

## 📦 Instalación

1. **Clona el repositorio**
   ```bash
   git clone https://github.com/brayan083/front-API2025.git
   cd front-API2025
   ```

2. **Instala las dependencias**
   ```bash
   npm install
   ```

3. **Configura las variables de entorno**
   ```bash
   # Crea un archivo .env.local en la raíz del proyecto
   VITE_API_URL=http://localhost:3000/api
   ```

4. **Inicia el servidor de desarrollo**
   ```bash
   npm run dev
   ```

5. **Abre tu navegador**
   ```
   http://localhost:5173
   ```

## 🏗️ Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── Auth.jsx        # Componente de autenticación
│   ├── Header.jsx      # Cabecera de la aplicación
│   ├── Home.jsx        # Página principal
│   ├── ProductCatalog.jsx  # Catálogo de productos
│   └── ShoppingCart.jsx    # Carrito de compras
├── contexts/           # Context providers
│   └── AuthContext.jsx # Contexto de autenticación
├── lib/               # Utilidades y configuración
│   └── api.js         # Cliente API
├── assets/            # Recursos estáticos
└── debug/             # Herramientas de debugging
```

## 📝 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Vista previa de la build de producción
- `npm run lint` - Ejecuta ESLint para revisar el código

## 🎨 Capturas de Pantalla

*[Aquí puedes añadir capturas de pantalla de tu aplicación]*

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/NuevaCaracteristica`)
3. Commit tus cambios (`git commit -m 'Añade nueva característica'`)
4. Push a la rama (`git push origin feature/NuevaCaracteristica`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - mira el archivo [LICENSE](LICENSE) para más detalles.

## 👥 Autores

- **Brayan083** - *Desarrollador Principal* - [brayan083](https://github.com/brayan083)

## 🙏 Agradecimientos

- Plantilla inicial de Vite + React
- Comunidad de React
- UADE - Aplicaciones Interactivas

---

⭐ Si te gusta este proyecto, ¡dale una estrella en GitHub!
