# Especificación Técnica y de Desarrollo de Software: EmprendeBúho

**Proyecto:** EmprendeBúho — *"Tu campus, tus emprendimientos"*

**Entidad Académica / Contexto:** Universidad de Sonora (UNISON), Campus Hermosillo

**Stack Tecnológico Objetivo:** React (Frontend SPA Mobile-First) + Express.js (Backend API REST) + SQLite (Base de Datos Relacional Local)

**Entorno de Ejecución:** Desarrollo 100% Local (Monorepo Cliente-Servidor sin dependencias de nube externas)

## 1. Contexto del Dominio, Problemática y Alcance del Sistema

### 1.1 Problemática a Resolver

Dentro del campus de la Universidad de Sonora (UNISON), una gran cantidad de estudiantes gestiona pequeños emprendimientos (venta de alimentos preparados, repostería, snacks, bisutería, maquillaje, artículos personalizados, materiales escolares y servicios) como ingreso complementario o para solventar sus gastos de estudios. Actualmente, la difusión de estas ofertas ocurre de manera dispersa y efímera a través de historias temporales en redes sociales, mensajes en grupos estudiantiles de mensajería o recomendaciones de boca en boca.

Esta dispersión genera cuatro problemas críticos tanto para los emprendedores como para los consumidores universitarios:

| Caso Detectado | Impacto en Emprendedores | Impacto en Consumidores | 
| ----- | ----- | ----- | 
| **Información poco precisa** | Menor alcance comercial y dependencia exclusiva de contactos previos. | Dificultad para comparar alternativas, precios y menús. | 
| **Ubicación cambiante** | Pérdida de ventas potenciales mientras el vendedor se desplaza por el campus. | Pérdida de tiempo intentando localizar físicamente al vendedor. | 
| **Horarios poco visibles** | Generación de expectativas incorrectas y mensajes repetitivos sobre disponibilidad. | Incertidumbre sobre si el negocio está atendiendo en ese instante. | 
| **Ausencia de un directorio** | Poca continuidad de la identidad del negocio dentro de la comunidad. | El descubrimiento de la oferta depende puramente de la casualidad. | 

Adicionalmente, ante los lineamientos institucionales de la Universidad de Sonora para regular el comercio interno, se requiere una herramienta digital centralizada que identifique a los emprendedores pertenecientes a la comunidad estudiantil, organice su oferta y proteja su privacidad mediante ubicaciones voluntarias, temporales y configurables, sin pretender sustituir un permiso oficial.

### 1.2 Propósito del Sistema y Límites de Alcance (In-Scope vs. Out-of-Scope)

**EmprendeBúho** es una plataforma web responsiva (con experiencia de aplicación móvil y de escritorio) que combina un directorio público de negocios estudiantiles con características visuales de red social, perfiles autenticados y verificados para emprendedores, catálogos detallados de productos y canales de contacto directo.

* **Dentro del Alcance (In-Scope):**

  * Consulta pública de todo el directorio, perfiles, menús y catálogos **sin necesidad de que el consumidor cree una cuenta**.

  * Solicitud de registro de cuentas de emprendedores con acreditación de pertenencia a la UNISON y flujo de aprobación/rechazo por administradores.

  * Gestión integral del perfil del negocio (foto/logo, foto de menú general, descripción, categoría, horario de atención por día, medios de contacto e indicador manual en tiempo real de estado **Abierto / Cerrado**).

  * Gestión completa del catálogo de productos (crear, editar, eliminar lógicamente y **pausar temporalmente** productos con imagen, descripción y precio).

  * Gestión de privacidad de ubicación: activación/desactivación voluntaria en un clic de la zona aproximada del campus o punto de referencia donde se encuentra el emprendedor.

  * Motor de búsqueda, filtrado multicriterio (nombre de negocio, nombre de producto, categoría, zona del campus, rango de precio, horario de atención y estado abierto/cerrado) y ordenamiento (alfabético, por cercanía/zona o abiertos ahora).

  * Guardado de emprendimientos favoritos del lado del consumidor (persistido localmente en el navegador mediante `localStorage`), contacto directo desde el perfil (botones de llamada telefónica, WhatsApp y redes sociales) y envío de reportes de negocios con información falsa o inapropiada.

  * Panel de administración para validar solicitudes de registro, gestionar categorías del sistema, ocultar productos que infrinjan reglas, revisar/resolver reportes de consumidores, suspender cuentas temporalmente y ejecutar tareas de mantenimiento (incluyendo ocultamiento automático de negocios inactivos).

* **Fuera del Alcance (Out-of-Scope — Prohibido Implementar):**

  * **Sin procesamiento de pagos:** El sistema **no** incluye carritos de compra transaccionales, pasarelas de pago (Stripe, PayPal, tarjetas) ni cobros integrados.

  * **Sin gestión de entregas o repartidores:** El sistema **no** procesa logística de envíos; el acuerdo de entrega o punto de encuentro ocurre por contacto directo entre consumidor y emprendedor.

## 2. Arquitectura Técnica y Estructura del Proyecto Local

### 2.1 Decisiones Arquitectónicas del Stack (React + Express + SQLite)

Para garantizar que los agentes de desarrollo construyan y ejecuten el sistema localmente sin fricciones ni servicios externos de pago, la arquitectura se divide en dos aplicaciones acopladas mediante una API REST sobre HTTP:

1. **Backend (`backend/`):**

   * **Runtime y Framework:** Node.js (v18+ o v20+) con **Express.js**.

   * **Motor de Base de Datos:** **SQLite 3** utilizando el driver síncrono de alto rendimiento `better-sqlite3` (o `sqlite3` con promesas). El archivo de base de datos se almacena localmente en `backend/database/emprendebuho.sqlite` con `PRAGMA foreign_keys = ON;` y `PRAGMA journal_mode = WAL;`.

   * **Autenticación y Seguridad:** JSON Web Tokens (`jsonwebtoken`) firmados con clave secreta local, contraseñas encriptadas con `bcryptjs` (10 salt rounds), validación de esquemas de entrada con `zod` (o `express-validator`) y cabeceras seguras con `helmet` y `cors`.

   * **Almacenamiento de Archivos (Imágenes):** Sistema de archivos local mediante `multer`. Las fotos de perfil, fotos de menú, imágenes de productos y credenciales estudiantiles se guardan en `backend/uploads/` (subdirectorios `profiles/`, `menus/`, `products/`, `credentials/`) y se sirven estáticamente en `/uploads`.

   * **Notificaciones y Recuperación de Contraseña en Local:** Dado que el desarrollo es 100% local, las notificaciones de aprobación/rechazo de cuenta (HU-27) y los enlaces/códigos de recuperación de contraseña (HU-32) se persisten en tablas del sistema (`notifications` y `password_reset_tokens`), se exponen en una bandeja de notificaciones dentro de la app, permiten consulta por estatus de solicitud mediante correo/matrícula y se imprimen de forma estructurada en la consola del servidor Express (simulando un transporte SMTP local).

2. **Frontend (`frontend/`):**

   * **Framework y Bundler:** **React 18+** inicializado con **Vite**.

   * **Enrutamiento:** `react-router-dom` v6.

   * **Estilos e Interfaz:** **Tailwind CSS** configurado con los tokens de color oficiales de la Universidad de Sonora (Azul Marino UNISON `#002D62`, Dorado UNISON `#F2A900` y superficies neutras de alto contraste) e iconografía con `lucide-react`.

   * **Diseño Responsivo (Mobile-First):** Interfaz pensada prioritariamente para pantallas móviles de estudiantes en movimiento dentro del campus (con barra de navegación inferior en móvil y barra superior en escritorio).

   * **Estado del Cliente:** React Context API (`AuthContext` para sesión JWT de Emprendedor/Administrador, `FavoritesContext` sincronizado con `localStorage` para Consumidores sin cuenta, y `ToastContext` para alertas y mensajes de error claros).

### 2.2 Estructura de Directorios del Repositorio

El proyecto debe organizarse en la siguiente estructura de carpetas para mantener separación de responsabilidades:

* `emprendebuho/` (Raíz del proyecto)

  * `README.md` (Instrucciones de instalación y ejecución local)

  * `backend/`

    * `package.json`

    * `.env` (Variables de entorno locales: `PORT=4000`, `JWT_SECRET`, `DB_PATH`, `INACTIVITY_DAYS_LIMIT=30`)

    * `src/`

      * `app.js` (Configuración de Express, CORS, JSON parser, rutas estáticas `/uploads` y manejador global de errores)

      * `server.js` (Punto de entrada HTTP y ejecución de tareas programadas de mantenimiento)

      * `config/`

        * `db.js` (Conexión SQLite, activación de `foreign_keys`, inicialización de `schema.sql` y `seed.sql`)

        * `upload.js` (Configuración de `multer`, validación de MIME types `image/jpeg`, `image/png`, `image/webp` y límite de 5 MB por imagen)

      * `middlewares/`

        * `auth.middleware.js` (Verificación de JWT, inyección de `req.user` y validación de cuenta activa no suspendida)

        * `role.middleware.js` (Guardias `requireRole('emprendedor')` y `requireRole('admin')`)

        * `validate.middleware.js` (Middleware genérico de validación de datos de entrada y formateo de errores claros)

      * `controllers/`

        * `auth.controller.js` (Registro HU-01, Login HU-40, estatus de solicitud HU-27, recuperación de contraseña HU-32, baja de cuenta HU-28)

        * `business.controller.js` (Directorio público HU-14, búsqueda/filtros HU-15/19/23/30/38/39, perfil público HU-18, edición de perfil HU-03/04/05/06/10/12/13/17/36, vista previa HU-34)

        * `product.controller.js` (CRUD de catálogo HU-02/07/08/09, pausar producto HU-11, búsqueda y filtro de productos por precio HU-33/37)

        * `report.controller.js` (Creación de reporte por consumidor HU-26)

        * `admin.controller.js` (Solicitudes pendientes HU-20/21, moderación de productos HU-20, suspensión de cuentas HU-22, gestión de reportes HU-24/35, CRUD categorías HU-16, mantenimiento general HU-25)

      * `routes/`

        * `auth.routes.js`

        * `business.routes.js`

        * `product.routes.js`

        * `report.routes.js`

        * `admin.routes.js`

        * `catalog.routes.js` (Listado público de categorías y zonas del campus UNISON)

      * `services/`

        * `maintenance.service.js` (Ocultamiento automático de negocios inactivos, respaldo local del archivo SQLite y limpieza de archivos huérfanos)

        * `notification.service.js` (Creación de notificaciones internas y log en consola local)

    * `database/`

      * `schema.sql` (DDL completo de tablas, restricciones e índices)

      * `seed.sql` (Datos semilla: administrador inicial, categorías base, zonas del campus UNISON y negocios de prueba)

      * `backups/` (Carpeta donde el módulo de mantenimiento guarda copias `.sqlite.bak`)

    * `uploads/`

      * `profiles/`

      * `menus/`

      * `products/`

      * `credentials/`

  * `frontend/`

    * `package.json`

    * `vite.config.js` (Con proxy de `/api` y `/uploads` hacia `http://localhost:4000`)

    * `index.html`

    * `src/`

      * `main.jsx`

      * `App.jsx`

      * `styles/`

        * `index.css` (Variables CSS institucionales UNISON y utilidades Tailwind)

      * `context/`

        * `AuthContext.jsx`

        * `FavoritesContext.jsx`

        * `ToastContext.jsx`

      * `services/`

        * `api.js` (Cliente HTTP centralizado con interceptores de errores claros y token JWT)

      * `components/`

        * `layout/` (`Navbar.jsx`, `BottomNav.jsx`, `Footer.jsx`, `AdminSidebar.jsx`)

        * `business/` (`BusinessCard.jsx`, `StatusBadge.jsx`, `ZoneBadge.jsx`, `ScheduleTable.jsx`, `ContactButtons.jsx`, `ReportModal.jsx`)

        * `product/` (`ProductCard.jsx`, `ProductFormModal.jsx`, `PriceRangeFilter.jsx`)

        * `search/` (`SearchBar.jsx`, `FilterDrawer.jsx`, `SortSelector.jsx`, `CampusZoneSelector.jsx`)

        * `common/` (`ErrorAlert.jsx`, `EmptyState.jsx`, `ConfirmDialog.jsx`, `ImageUploader.jsx`)

      * `pages/`

        * `public/` (`ExplorePage.jsx`, `SearchPage.jsx`, `BusinessDetailPage.jsx`, `FavoritesPage.jsx`, `ApplicationStatusPage.jsx`)

        * `auth/` (`LoginPage.jsx`, `RegisterRequestPage.jsx`, `ForgotPasswordPage.jsx`, `ResetPasswordPage.jsx`)

        * `entrepreneur/` (`DashboardPage.jsx`, `ProfileEditorPage.jsx`, `CatalogManagerPage.jsx`, `ScheduleLocationPage.jsx`, `ProfilePreviewPage.jsx`)

        * `admin/` (`AdminDashboardPage.jsx`, `PendingRequestsPage.jsx`, `ReportsManagerPage.jsx`, `CategoriesManagerPage.jsx`, `ModerationProductsPage.jsx`, `SystemMaintenancePage.jsx`)

## 3. Catálogo Completo de Requerimientos e Historias de Usuario

### 3.1 Requerimientos Funcionales Base (RF)

 1. **RF-01:** El sistema debe permitir a un administrador aprobar o rechazar solicitudes de registro de emprendedores acreditando su pertenencia a la Universidad de Sonora.

 2. **RF-02:** El emprendedor debe poder iniciar sesión de forma segura y administrar toda la información de su perfil de negocio.

 3. **RF-03:** El emprendedor debe poder agregar, editar, pausar temporalmente y eliminar productos de su catálogo individual.

 4. **RF-04:** El emprendedor debe poder establecer y actualizar el horario de atención de su negocio desglosado por días de la semana.

 5. **RF-05:** El emprendedor debe poder indicar en tiempo real mediante un interruptor rápido si su negocio se encuentra **Abierto** o **Cerrado**.

 6. **RF-06:** El emprendedor podrá compartir voluntariamente una ubicación aproximada o zona dentro del campus y desactivarla en cualquier momento.

 7. **RF-07:** El consumidor debe poder buscar emprendimientos por nombre del negocio o por nombre específico de un producto sin necesidad de registrarse.

 8. **RF-08:** El consumidor debe poder filtrar emprendimientos combinando categoría, horario de atención, estado (abierto/cerrado), rango de precios y zona del campus.

 9. **RF-09:** El administrador debe poder moderar y ocultar publicaciones de productos y suspender perfiles que incumplan las reglas de la plataforma.

10. **RF-10:** El sistema debe mostrar los medios de contacto directo proporcionados por el emprendedor (llamada, WhatsApp, redes sociales) para concretar la comunicación.

### 3.2 Requerimientos No Funcionales (RNF) y Reglas Técnicas

1. **RNF-01 (Usabilidad Estudiantil):** Interfaz sencilla, limpia e intuitiva diseñada para flujos rápidos de consulta entre clases (máximo 2 clics desde la portada hasta el botón de contacto del vendedor).

2. **RNF-02 (Adaptabilidad Web y Móvil):** Diseño 100% responsivo (*Mobile-First*). En pantallas menores a `768px` debe comportarse como una aplicación móvil con barra de navegación inferior fija.

3. **RNF-03 (Disponibilidad en Horario Escolar):** Operación continua garantizada durante todo el horario escolar (`07:00` a `21:00` hrs) y soporte para comparación automática de horarios locales de Hermosillo (`America/Hermosillo`, UTC-7 sin horario de verano).

4. **RNF-04 (Identidad Visual UNISON):** Aplicación estricta de la paleta de colores institucional de la Universidad de Sonora (Azul `#002D62`, Dorado `#F2A900`, Blanco `#FFFFFF`).

5. **RNF-05 (Manejo de Errores Claros):** Prohibido exponer trazas crudas de SQLite o códigos HTTP crípticos al usuario. Toda falla de validación, red o permisos debe presentarse en español con un mensaje claro y accionable.

6. **RNF-06 (Privacidad Estricta del Emprendedor):** Los consumidores **únicamente** podrán visualizar la información que el emprendedor haya decidido hacer pública. Si `mostrar_ubicacion = 0`, el backend debe omitir `campus_zone_id`, nombre de zona y descripción de ubicación en las respuestas públicas de la API.

### 3.3 Matriz Exhaustiva de las 40 Historias de Usuario (Con Criterios Técnicos de Implementación)

> **Nota sobre la Historia de Usuario 20 (HU-20):** En la documentación del proyecto, el identificador `HU-20` se utiliza en la tabla de prioridades para *"Ocultar publicaciones de productos que incumplan las reglas"* y en la tabla de asignación para *"Revisar y aprobar las solicitudes de registro de emprendedores (asegurando pertenencia a la UNISON)"*. Ambas funcionalidades son obligatorias y se especifican a continuación como **HU-20A** y **HU-20B**.

| ID | Rol | Historia de Usuario (Objetivo y Beneficio) | Prioridad / Complejidad | Especificación Técnica de Implementación (React + Express + SQLite) | 
| ----- | ----- | ----- | ----- | ----- | 
| **HU-01** | Emprendedor | Solicitar hacer una cuenta para registrar mi negocio en la app. | Alta / Alta | Formulario `/registro` con datos del estudiante (`nombre_completo`, `email_institucional` con validación de dominio `@unison.mx` o matrícula de 9 dígitos, `password`, `credencial_url` o comprobante opcional) y datos iniciales del negocio (`nombre_negocio`, `category_id`). Crea registro en `users` con `estado_cuenta = 'pendiente'` y en `businesses`. | 
| **HU-02** | Emprendedor | Publicar el catálogo de mi negocio (una imagen y descripción por producto) para que el cliente visualice mis ofertas. | Alta / Alta | Endpoint `POST /api/my-business/products` con `multipart/form-data`. Guarda imagen en `/uploads/products/`, valida nombre y descripción obligatorios y persiste en tabla `products` con `estado = 'activo'`. | 
| **HU-03** | Emprendedor | Publicar una foto del menú de mi negocio para que el cliente visualice las ofertas de mis productos de un vistazo. | Alta / Baja | Campo `foto_menu_url` en tabla `businesses`. Endpoint `PUT /api/my-business/menu-photo` permite subir o reemplazar la imagen del menú general y mostrarla en una pestaña o visor ampliable (*lightbox*) dentro del perfil público. | 
| **HU-04** | Emprendedor | Poner una foto de perfil en mi cuenta para que los clientes me reconozcan por mi foto/logo. | Baja / Baja | Campo `foto_perfil_url` en `businesses`. Endpoint `PUT /api/my-business/profile-photo` actualiza el avatar/logo cuadrado o circular mostrado en tarjetas de exploración y cabecera del perfil. | 
| **HU-05** | Emprendedor | Dar una clasificación a mi negocio (alimentos, bisutería, maquillaje, etc.) para facilitar su localización. | Baja / Baja | Llave foránea `category_id` en `businesses` vinculada a la tabla `categories` (más soporte opcional para etiquetas secundarias). Selector dinámico en el editor de perfil alimentado por `GET /api/catalogs/categories`. | 
| **HU-06** | Emprendedor | Agregar una descripción del negocio para explicar qué productos o servicios ofrezco. | Alta / Baja | Campo `descripcion` (`TEXT`, máx. 1000 caracteres) en `businesses`. Editable desde `/panel/perfil` con contador de caracteres en vivo. | 
| **HU-07** | Emprendedor | Indicar el precio de cada producto para informar al cliente cuánto cuesta antes de contactarme. | Alta / Baja | Campo `precio` (`REAL NOT NULL CHECK(precio >= 0)`) en tabla `products`. Formateado en el frontend en pesos mexicanos (`$XX.XX MXN`). | 
| **HU-08** | Emprendedor | Editar productos de mi catálogo para mantener actualizada la información de mi oferta. | Alta / Baja | Endpoint `PUT /api/my-business/products/:id` que verifica propiedad (`business.user_id === req.user.id`) y permite actualizar `nombre`, `descripcion`, `precio` y opcionalmente reemplazar la `imagen_url`. | 
| **HU-09** | Emprendedor | Eliminar productos de mi catálogo para retirar productos que ya no tenga disponibles. | Alta / Baja | Endpoint `DELETE /api/my-business/products/:id` con confirmación modal en UI. Ejecuta borrado lógico (`estado = 'eliminado'`) o físico y elimina el archivo de imagen huérfano si aplica. | 
| **HU-10** | Emprendedor | Publicar ubicación aproximada para facilitar a los clientes encontrarme dentro del campus. | Media / Media | Campos `campus_zone_id` (selector de zona oficial de la UNISON) y `ubicacion_detalle` (texto corto de referencia, ej. *"Mesas frente al edificio 3K de Computación"*) en `businesses`, junto con `mostrar_ubicacion = 1`. | 
| **HU-11** | Emprendedor | Pausar productos de mi catálogo para hacer saber a mis clientes que el producto no está disponible temporalmente. | Media / Baja | Endpoint `PATCH /api/my-business/products/:id/status` que alterna `estado` entre `'activo'` y `'pausado'`. En el perfil público, los productos pausados se muestran al final con distintivo *"Agotado temporalmente"* (o se ocultan en búsquedas de disponibilidad inmediata). | 
| **HU-12** | Emprendedor | Desactivar ubicación para proteger mi privacidad cuando no quiero mostrar dónde estoy. | Media / Baja | Interruptor rápido en el panel del emprendedor (`PATCH /api/my-business/location-visibility`) que cambia `mostrar_ubicacion = 0`. Oculta inmediatamente la zona y el punto de referencia en todas las consultas públicas. | 
| **HU-13** | Emprendedor | Agregar medios de contacto para permitir a los clientes comunicarse conmigo. | Alta / Baja | Tabla `business_contacts` (1:N con `businesses`). Permite registrar teléfono de llamada, número de WhatsApp, usuario/URL de Instagram, Facebook o TikTok con validación de formato. | 
| **HU-14** | Consumidor | Visualizar los emprendimientos disponibles para conocer los negocios que existen dentro de la universidad. | Alta / Media | Vista principal `/explorar` (`GET /api/businesses`) que lista únicamente negocios cuya cuenta de usuario esté `'aprobada'` y `inactivo_oculto = 0`, presentando tarjetas tipo red social con foto, nombre, categoría, estado Abierto/Cerrado y zona (si es pública). | 
| **HU-15** | Consumidor | Buscar un emprendimiento por nombre para encontrar de manera rápida un negocio específico. | Alta / Media | Parámetro `?q=` en `GET /api/businesses` con búsqueda insensible a mayúsculas y acentos (`LIKE` normalizado) sobre `businesses.nombre_negocio` y `businesses.descripcion`. | 
| **HU-16** | Administrador | Gestionar las categorías disponibles del sistema para mantener organizada la clasificación de negocios. | Media / Media | Vista `/admin/categorias` y endpoints `POST`, `PUT`, `PATCH /api/admin/categories/:id` para crear, renombrar, cambiar ícono o activar/desactivar categorías sin romper llaves foráneas existentes. | 
| **HU-17** | Emprendedor | Indicar si mi negocio está abierto o cerrado para informar si puedo atender en ese momento. | Alta / Baja | Interruptor destacado en la cabecera del panel del emprendedor (`PATCH /api/my-business/open-status`) que actualiza `esta_abierto` (`0` o `1`) y refresca `last_active_at`. | 
| **HU-18** | Consumidor | Consultar el perfil de un emprendimiento para conocer sus productos, precios, horarios y medios de contacto. | Alta / Media | Vista `/negocio/:slug` (`GET /api/businesses/:slug`) que carga cabecera del negocio, indicador de estado en tiempo real, horarios semanales, foto del menú, cuadrícula de catálogo de productos con precios y botones de contacto directo. | 
| **HU-19** | Consumidor | Filtrar emprendimientos por categoría de producto para encontrar opciones acordes con lo que busco. | Alta / Media | Filtro por chips horizontales o selector múltiple (`?category_id=`) en `/explorar`. | 
| **HU-20A** | Administrador | Ocultar publicaciones de productos que incumplan las reglas para evitar contenido inapropiado o engañoso. | Alta / Media | Endpoint `PATCH /api/admin/products/:id/moderate` que cambia `products.estado = 'oculto_admin'`, registra `motivo_moderacion`, genera notificación al emprendedor y guarda evento en `audit_logs`. | 
| **HU-20B / HU-21** | Administrador | Revisar las solicitudes de registro pendientes y aprobar o rechazar nuevas cuentas verificando pertenencia a la UNISON. | Alta / Alta | Vista `/admin/solicitudes` (`GET /api/admin/requests?status=pendiente`). Muestra nombre, matrícula, correo institucional y foto de credencial/comprobante. `PATCH /api/admin/requests/:userId` aprueba (`estado_cuenta = 'aprobada'`) o rechaza (`estado_cuenta = 'rechazada'` con motivo obligatorio). | 
| **HU-22** | Administrador | Suspender temporalmente una cuenta para aplicar sanciones cuando se incumplan reglas de la plataforma. | Media / Alta | Endpoint `PATCH /api/admin/users/:id/suspend` que establece `estado_cuenta = 'suspendida'` y `motivo_rechazo_o_suspension`. Invalida el acceso de escritura del emprendedor y oculta su negocio del directorio público hasta que se levante la sanción. | 
| **HU-23** | Consumidor | Buscar emprendimientos por zona del campus para ubicar negocios cercanos sin necesitar la ubicación exacta del vendedor. | Media / Media | Filtro `?zone_id=` en `GET /api/businesses` que filtra exclusivamente negocios con `mostrar_ubicacion = 1` y `campus_zone_id = :zone_id`. Incluye mapa esquemático o selector visual de sectores del campus UNISON. | 
| **HU-24** | Administrador | Gestionar los reportes enviados por los consumidores para tomar decisiones sobre cuentas denunciadas. | Media / Alta | Endpoint `PATCH /api/admin/reports/:id` en `/admin/reportes`. Permite cambiar estado del reporte (`en_revision`, `resuelto_con_sancion`, `desestimado`) y ejecutar acciones directas desde el mismo modal (ocultar producto o suspender cuenta). | 
| **HU-25** | Administrador | Dar mantenimiento general a la plataforma para asegurar su correcto funcionamiento. | Media / Media | Vista `/admin/mantenimiento` con tres herramientas: (1) Ejecutar barrido de ocultamiento de negocios inactivos (`inactivo_oculto = 1` tras $N$ días sin actividad), (2) Generar y descargar respaldo instantáneo de la base de datos SQLite (`POST /api/admin/maintenance/backup`), y (3) Consultar métricas de salud y bitácora `audit_logs`. | 
| **HU-26** | Consumidor | Reportar un negocio con información falsa o inapropiada para ayudar a mantener el directorio confiable. | Media / Baja | Botón *"Reportar negocio"* en el perfil público (`/negocio/:slug`) que abre modal con motivo tipificado (`informacion_falsa`, `contenido_inapropiado`, `producto_prohibido`, `otro`) y comentario. Envía `POST /api/reports` con limitación de tasa (*rate-limit* por IP) sin requerir cuenta. | 
| **HU-27** | Emprendedor | Recibir una notificación cuando mi cuenta sea aprobada o rechazada para saber si ya puedo publicar. | Alta / Baja | Al aprobar/rechazar en `HU-21`, el backend inserta un registro en `notifications`, emite log en consola local y habilita el endpoint público `GET /api/auth/request-status?identifier=` (además de mostrar el banner de estado al iniciar sesión). | 
| **HU-28** | Emprendedor | Eliminar mi cuenta para dejar de aparecer en el directorio si cierro mi negocio. | Media / Baja | Endpoint `DELETE /api/my-account` con confirmación de contraseña actual. Marca `estado_cuenta = 'eliminada'`, cierra el negocio (`esta_abierto = 0`, `mostrar_ubicacion = 0`) y revoca la sesión. | 
| **HU-29** | Consumidor | Contactar al emprendedor directamente desde su perfil (botón de llamada/redes sociales). | Alta / Media | Componente `ContactButtons.jsx` en `/negocio/:slug` que genera enlaces profundos accionables: `https://wa.me/521...` con mensaje prellenado (*"Hola, vi tu negocio en EmprendeBúho UNISON..."*), `tel:+52...`, e hipervínculos directos a Instagram/Facebook. | 
| **HU-30** | Consumidor | Ordenar los resultados de búsqueda (alfabético, por cercanía/zona, o si está abierto ahora). | Media / Alta | Parámetro `?sort=` en `GET /api/businesses` con opciones: `open_now` (`esta_abierto DESC, nombre_negocio ASC`), `alpha_asc` (`nombre_negocio COLLATE NOCASE ASC`), `alpha_desc` y `proximity` (ordenando primero los negocios que coinciden con la zona actual seleccionada por el estudiante en el campus). | 
| **HU-31** | Consumidor | Guardar emprendimientos como favoritos para encontrar rápidamente los negocios que me interesaron. | Media / Media | Dado que el consumidor no requiere cuenta, `FavoritesContext` almacena un arreglo de IDs de negocios en `localStorage` (`emprendebuho_favorites`). La vista `/favoritos` consulta `GET /api/businesses?ids=1,4,9` para mostrar datos frescos y estado Abierto/Cerrado en tiempo real. | 
| **HU-32** | Emprendedor | Recuperar mi contraseña en caso de olvidarla para volver a acceder sin crear cuenta nueva. | Alta / Media | Flujo en `/recuperar-password`: `POST /api/auth/forgot-password` genera un código/token temporal de 6 dígitos (válido por 15 min) en `password_reset_tokens` y lo muestra en la consola del servidor local (y en un recuadro de modo desarrollo local si `NODE_ENV=development`). `POST /api/auth/reset-password` valida el token y actualiza `password_hash`. | 
| **HU-33** | Consumidor | Filtrar productos por rango de precio para encontrar opciones que se ajusten a mi presupuesto. | Media / Media | Parámetros `?min_price=&max_price=` tanto en `GET /api/products` como en `GET /api/businesses` (filtrando negocios que tengan al menos un producto activo dentro del rango `[min_price, max_price]`). | 
| **HU-34** | Emprendedor | Visualizar cómo se muestra mi perfil a los consumidores para verificar la información antes de promocionarlo. | Media / Baja | Ruta protegida `/panel/vista-previa` que renderiza el componente exacto `BusinessDetailPage` usando los datos actuales del emprendedor con una barra superior indicadora *"Modo Vista Previa Consumidor"* (respetando exactamente el filtro de privacidad `mostrar_ubicacion` y ocultando productos pausados/eliminados según corresponda). | 
| **HU-35** | Administrador | Consultar los reportes realizados por los consumidores para revisar negocios reportados y decidir acciones. | Alta / Media | Vista `/admin/reportes` (`GET /api/admin/reports`) con filtros por estado (`pendiente`, `en_revision`, `resuelto_con_sancion`, `desestimado`), conteo de reincidencias por negocio y enlace directo al perfil o producto reportado. | 
| **HU-36** | Emprendedor | Establecer el horario de atención de mi negocio para informar cuándo pueden encontrarme. | Media / Baja | Tabla `business_schedules` (días `0=Domingo` a `6=Sábado`, `hora_apertura`, `hora_cierre`, `cerrado_todo_el_dia`). Editor visual semanal en `/panel/horarios` con actualización atómica vía `PUT /api/my-business/schedules`. | 
| **HU-37** | Consumidor | Buscar un producto por su nombre para encontrar rápidamente los emprendimientos que lo ofrecen. | Media / Media | Buscador con selector de modo (*"Buscar por Negocio"* / *"Buscar por Producto"*) o vista unificada que consulta `GET /api/products?q=brownie` y devuelve tarjetas de producto indicando a qué emprendimiento pertenecen, su precio y si el negocio está abierto ahora. | 
| **HU-38** | Consumidor | Filtrar emprendimientos por horario de atención para encontrar negocios disponibles a la hora que necesito. | Media / Media | Parámetros `?day_of_week=&time=HH:MM` en `GET /api/businesses` que hacen `JOIN` con `business_schedules` verificando `cerrado_todo_el_dia = 0 AND hora_apertura <= :time AND hora_cierre >= :time`. Incluye botón rápido *"Disponibles a esta hora"*. | 
| **HU-39** | Consumidor | Filtrar emprendimientos por estado abierto o cerrado para evitar contactar negocios que no estén atendiendo. | Alta / Media | Interruptor prominente *"Solo abiertos ahora"* (`?open_now=true` -> `businesses.esta_abierto = 1`) en la barra superior de exploración y búsqueda. | 
| **HU-40** | Emprendedor | Iniciar sesión en mi cuenta para administrar de manera segura la información de mi negocio. | Alta / Media | Endpoint `POST /api/auth/login`. Verifica credenciales con `bcrypt.compare`, comprueba el estado de la cuenta (si está `'pendiente'`, `'rechazada'` o `'suspendida'` muestra pantalla informativa específica con el motivo; si está `'aprobada'`, entrega JWT y redirige a `/panel`). | 

## 4. Diseño de Base de Datos Relacional en SQLite (DDL y Semillas)

### 4.1 Esquema Completo SQL (`backend/database/schema.sql`)

El siguiente script SQL define todas las tablas, llaves foráneas, restricciones de dominio e índices de rendimiento que el backend debe ejecutar automáticamente al iniciar si las tablas no existen:

```
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- 1. Tabla de Usuarios (Emprendedores y Administradores)
-- Los consumidores NO requieren cuenta según la regla de negocio central.
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_completo TEXT NOT NULL,
    matricula_unison TEXT UNIQUE,
    email_institucional TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    credencial_url TEXT,
    rol TEXT NOT NULL DEFAULT 'emprendedor' CHECK (rol IN ('emprendedor', 'admin')),
    estado_cuenta TEXT NOT NULL DEFAULT 'pendiente' CHECK (
        estado_cuenta IN ('pendiente', 'aprobada', 'rechazada', 'suspendida', 'eliminada')
    ),
    motivo_rechazo_o_suspension TEXT,
    aprobado_por INTEGER REFERENCES users(id) ON DELETE SET NULL,
    fecha_resolucion_cuenta DATETIME,
    last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Categorías del Sistema (HU-05, HU-16, HU-19)
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    icono TEXT NOT NULL DEFAULT 'Store',
    activa INTEGER NOT NULL DEFAULT 1 CHECK (activa IN (0, 1)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Zonas del Campus UNISON (HU-10, HU-23, HU-30)
CREATE TABLE IF NOT EXISTS campus_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL UNIQUE,
    descripcionbuildings TEXT,
    orden_visual INTEGER NOT NULL DEFAULT 0,
    activa INTEGER NOT NULL DEFAULT 1 CHECK (activa IN (0, 1))
);

-- 4. Tabla de Emprendimientos / Negocios (HU-03, HU-04, HU-06, HU-10, HU-12, HU-17)
CREATE TABLE IF NOT EXISTS businesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    campus_zone_id INTEGER REFERENCES campus_zones(id) ON DELETE SET NULL,
    nombre_negocio TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    descripcion TEXT DEFAULT '',
    foto_perfil_url TEXT,
    foto_menu_url TEXT,
    esta_abierto INTEGER NOT NULL DEFAULT 0 CHECK (esta_abierto IN (0, 1)),
    mostrar_ubicacion INTEGER NOT NULL DEFAULT 1 CHECK (mostrar_ubicacion IN (0, 1)),
    ubicacion_detalle TEXT DEFAULT '',
    es_destacado INTEGER NOT NULL DEFAULT 0 CHECK (es_destacado IN (0, 1)),
    inactivo_oculto INTEGER NOT NULL DEFAULT 0 CHECK (inactivo_oculto IN (0, 1)),
    last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Horarios de Atención por Día (HU-36, HU-38)
-- dia_semana: 0 = Domingo, 1 = Lunes, 2 = Martes, 3 = Miércoles, 4 = Jueves, 5 = Viernes, 6 = Sábado
CREATE TABLE IF NOT EXISTS business_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    hora_apertura TEXT NOT NULL DEFAULT '08:00', -- Formato 'HH:MM' 24 hrs
    hora_cierre TEXT NOT NULL DEFAULT '18:00',   -- Formato 'HH:MM' 24 hrs
    cerrado_todo_el_dia INTEGER NOT NULL DEFAULT 0 CHECK (cerrado_todo_el_dia IN (0, 1)),
    UNIQUE(business_id, dia_semana)
);

-- 6. Tabla de Medios de Contacto del Emprendimiento (HU-13, HU-29)
CREATE TABLE IF NOT EXISTS business_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    tipo_contacto TEXT NOT NULL CHECK (
        tipo_contacto IN ('whatsapp', 'telefono', 'instagram', 'facebook', 'tiktok', 'otro')
    ),
    valor TEXT NOT NULL,
    etiqueta TEXT,
    es_principal INTEGER NOT NULL DEFAULT 0 CHECK (es_principal IN (0, 1)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabla de Catálogo de Productos (HU-02, HU-07, HU-08, HU-09, HU-11, HU-20A, HU-33, HU-37)
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT NOT NULL DEFAULT '',
    precio REAL NOT NULL CHECK (precio >= 0),
    imagen_url TEXT,
    estado TEXT NOT NULL DEFAULT 'activo' CHECK (
        estado IN ('activo', 'pausado', 'oculto_admin', 'eliminado')
    ),
    motivo_moderacion TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabla de Reportes de Consumidores (HU-24, HU-26, HU-35)
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    motivo TEXT NOT NULL CHECK (
        motivo IN ('informacion_falsa', 'contenido_inapropiado', 'producto_prohibido', 'suplantacion', 'otro')
    ),
    descripcion TEXT NOT NULL,
    estado_reporte TEXT NOT NULL DEFAULT 'pendiente' CHECK (
        estado_reporte IN ('pendiente', 'en_revision', 'resuelto_con_sancion', 'desestimado')
    ),
    notas_admin TEXT,
    resuelto_por INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME
);

-- 9. Tabla de Notificaciones del Sistema para Emprendedores (HU-27)
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (
        tipo IN ('cuenta_aprobada', 'cuenta_rechazada', 'cuenta_suspendida', 'producto_oculto', 'sistema')
    ),
    titulo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    leida INTEGER NOT NULL DEFAULT 0 CHECK (leida IN (0, 1)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. Tabla de Tokens de Recuperación de Contraseña (HU-32)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    codigo_recuperacion TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    usado INTEGER NOT NULL DEFAULT 0 CHECK (usado IN (0, 1)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. Bitácora de Auditoría y Mantenimiento de Administradores (HU-25)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    accion TEXT NOT NULL,
    entidad_tipo TEXT NOT NULL,
    entidad_id INTEGER,
    detalles TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar búsquedas y filtros frecuentes
CREATE INDEX IF NOT EXISTS idx_users_estado ON users(estado_cuenta);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category_id);
CREATE INDEX IF NOT EXISTS idx_businesses_zone ON businesses(campus_zone_id);
CREATE INDEX IF NOT EXISTS idx_businesses_open ON businesses(esta_abierto, inactivo_oculto);
CREATE INDEX IF NOT EXISTS idx_businesses_nombre ON businesses(nombre_negocio COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_products_business_estado ON products(business_id, estado);
CREATE INDEX IF NOT EXISTS idx_products_precio ON products(precio);
CREATE INDEX IF NOT EXISTS idx_products_nombre ON products(nombre COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_schedules_lookup ON business_schedules(dia_semana, cerrado_todo_el_dia, hora_apertura, hora_cierre);
CREATE INDEX IF NOT EXISTS idx_reports_estado ON reports(estado_reporte);

```

### 4.2 Catálogos Semilla Iniciales (`backend/database/seed.sql`)

El script de inicialización debe insertar los siguientes catálogos base adaptados al campus Hermosillo de la Universidad de Sonora:

* **Categorías Iniciales (`categories`):**

  1. `Alimentos y Comidas` (slug: `alimentos`, ícono: `Utensils`)

  2. `Repostería y Postres` (slug: `reposteria`, ícono: `Cake`)

  3. `Snacks y Bebidas` (slug: `snacks`, ícono: `Coffee`)

  4. `Bisutería y Accesorios` (slug: `bisuteria`, ícono: `Gem`)

  5. `Maquillaje y Cuidado Personal` (slug: `maquillaje`, ícono: `Sparkles`)

  6. `Artículos Personalizados y Stickers` (slug: `personalizados`, ícono: `Palette`)

  7. `Material Escolar y Electrónica` (slug: `material-escolar`, ícono: `BookOpen`)

  8. `Servicios y Asesorías` (slug: `servicios`, ícono: `Briefcase`)

* **Zonas del Campus UNISON (`campus_zones`):**

  1. `ZONA-CIENCIAS` — **Ciencias Exactas y Computación** (Edificios 3K, 3B, Matemáticas, Física y Geología)

  2. `ZONA-BIBLIOTECA` — **Biblioteca Central y Museo** (Explanada de Biblioteca Fernando Pesqueira y alrededores)

  3. `ZONA-PLAZA` — **Plaza del Estudiante y Comedor Universitario** (Corazón del campus y áreas de descanso)

  4. `ZONA-INGENIERIA` — **División de Ingeniería** (Ingeniería Civil, Industrial, Minas, Químicas y Metalurgia)

  5. `ZONA-SOCIALES` — **Ciencias Sociales, Derecho y Contabilidad** (ECA, Derecho, Psicología, Comunicación y Trabajo Social)

  6. `ZONA-SALUD` — **Ciencias Biológicas y de la Salud** (Medicina, Enfermería, Odontología, Químico Biólogo y Nutrición)

  7. `ZONA-HUMANIDADES` — **Humanidades y Bellas Artes** (Lenguas Extranjeras, Arquitectura, Artes y Letras)

  8. `ZONA-DEPORTIVA` — **Área Deportiva y Gimnasio Universitario** (Estadio Castro Servín y canchas)

  9. `ZONA-MOVIL` — **Vendedor en Movimiento / Entrega a Acordar en Campus** (Sin punto fijo, se desplaza entre departamentos)

* **Cuentas de Prueba Preconfiguradas:**

  * **Administrador Principal:** `admin@unison.mx` / Contraseña: `AdminUnison2026!` (`rol = 'admin'`, `estado_cuenta = 'aprobada'`).

  * **Emprendedor Aprobado Demo 1:** *"Búho Brownies & Postres"* (`fernanda.demo@unison.mx` / `Buho2026!`, categoría `Repostería y Postres`, zona `ZONA-CIENCIAS`, abierto ahora, con 4 productos activos y 1 producto pausado).

  * **Emprendedor Aprobado Demo 2:** *"Stickers y Pines Cholesky"* (`orlando.demo@unison.mx` / `Buho2026!`, categoría `Artículos Personalizados y Stickers`, zona `ZONA-PLAZA`).

  * **Emprendedor Pendiente Demo 3:** Solicitud pendiente de revisión (`nuevo.emprendedor@unison.mx` / `Buho2026!`, `estado_cuenta = 'pendiente'`) para probar de inmediato `HU-20B` / `HU-21`.

## 5. Especificación Detallada de la API REST (Express.js)

Todos los endpoints devuelven respuestas JSON con la estructura estándar:

* **Éxito:** `{ "ok": true, "data": { ... }, "message": "..." }`

* **Error (RNF-05):** `{ "ok": false, "error": { "code": "ERROR_CODE", "message": "Mensaje claro en español para el estudiante", "details": [] } }`

### 5.1 Endpoints Públicos (Consumidor y Consulta General)

| Método y Ruta | Historias Cubiertas | Descripción, Query Params y Reglas de Negocio | 
| ----- | ----- | ----- | 
| `GET /api/catalogs` | HU-05, HU-19, HU-23 | Devuelve `{ categories, campus_zones }` activos para poblar filtros y formularios. | 
| `GET /api/businesses` | HU-14, HU-15, HU-19, HU-23, HU-30, HU-31, HU-33, HU-38, HU-39 | Lista y filtra emprendimientos activos. **Filtros (`req.query`):** `q` (texto nombre/descripción/producto), `category_id`, `zone_id`, `open_now` (`true`/`false`), `min_price`, `max_price`, `day_of_week` (`0-6`), `time` (`HH:MM`), `ids` (lista separada por comas para Favoritos), `sort` (`open_now`, `alpha_asc`, `alpha_desc`, `proximity`), `preferred_zone_id` (para ordenar por cercanía). | 
| `GET /api/businesses/:slug` | HU-18, HU-29 | Obtiene el detalle completo de un emprendimiento público: datos del negocio, categoría, horarios (`business_schedules`), medios de contacto (`business_contacts`) y catálogo de productos (`estado IN ('activo', 'pausado')`). | 
| `GET /api/products` | HU-33, HU-37 | Buscador directo de productos en todo el campus. **Filtros (`req.query`):** `q` (nombre/descripción del producto), `category_id`, `min_price`, `max_price`, `open_now`, `zone_id`. Solo incluye productos con `estado = 'activo'` de negocios aprobados y visibles. | 
| `POST /api/reports` | HU-26 | Registra un reporte ciudadano sobre un negocio o producto (`{ business_id, product_id?, motivo, descripcion }`). No requiere cuenta. | 

#### Regla Crítica de Serialización de Privacidad (HU-12 y RNF-06)

En `GET /api/businesses`, `GET /api/businesses/:slug` y `GET /api/products`, todo objeto de negocio debe pasar por la función `sanitizePublicBusiness(business)`:

* Si `business.mostrar_ubicacion === 0`:

  * Forzar `campus_zone_id = null`, `zona_nombre = null`, `zona_codigo = null` y `ubicacion_detalle = null` en el JSON enviado al cliente.

  * Excluir a dicho negocio cuando el consumidor aplique un filtro explícito por `?zone_id=`.

#### Consulta SQL Parametrizada de Referencia para el Motor de Búsqueda (`GET /api/businesses`)

```
SELECT
  b.id, b.nombre_negocio, b.slug, b.descripcion,
  b.foto_perfil_url, b.foto_menu_url, b.esta_abierto,
  b.mostrar_ubicacion, b.es_destacado, b.updated_at,
  c.id AS category_id, c.nombre AS category_nombre, c.slug AS category_slug, c.icono AS category_icono,
  CASE WHEN b.mostrar_ubicacion = 1 THEN z.id ELSE NULL END AS campus_zone_id,
  CASE WHEN b.mostrar_ubicacion = 1 THEN z.nombre ELSE NULL END AS zona_nombre,
  CASE WHEN b.mostrar_ubicacion = 1 THEN b.ubicacion_detalle ELSE NULL END AS ubicacion_detalle,
  (SELECT MIN(p.precio) FROM products p WHERE p.business_id = b.id AND p.estado = 'activo') AS precio_minimo,
  (SELECT MAX(p.precio) FROM products p WHERE p.business_id = b.id AND p.estado = 'activo') AS precio_maximo
FROM businesses b
JOIN users u ON u.id = b.user_id
JOIN categories c ON c.id = b.category_id
LEFT JOIN campus_zones z ON z.id = b.campus_zone_id
WHERE u.estado_cuenta = 'aprobada'
  AND b.inactivo_oculto = 0
  -- Filtro opcional por texto (nombre de negocio o que tenga un producto con ese nombre)
  AND (:q IS NULL OR (
    b.nombre_negocio LIKE '%' || :q || '%'
    OR b.descripcion LIKE '%' || :q || '%'
    OR EXISTS (
      SELECT 1 FROM products p
      WHERE p.business_id = b.id AND p.estado = 'activo' AND p.nombre LIKE '%' || :q || '%'
    )
  ))
  -- Filtro por categoría
  AND (:category_id IS NULL OR b.category_id = :category_id)
  -- Filtro por zona del campus (solo negocios con ubicación activa)
  AND (:zone_id IS NULL OR (b.mostrar_ubicacion = 1 AND b.campus_zone_id = :zone_id))
  -- Filtro por estado abierto ahora
  AND (:open_now IS NULL OR b.esta_abierto = :open_now)
  -- Filtro por rango de precio de productos
  AND (:min_price IS NULL OR EXISTS (
    SELECT 1 FROM products p WHERE p.business_id = b.id AND p.estado = 'activo' AND p.precio >= :min_price
  ))
  AND (:max_price IS NULL OR EXISTS (
    SELECT 1 FROM products p WHERE p.business_id = b.id AND p.estado = 'activo' AND p.precio <= :max_price
  ))
  -- Filtro por horario de atención (día y hora)
  AND (:day_of_week IS NULL OR :time IS NULL OR EXISTS (
    SELECT 1 FROM business_schedules s
    WHERE s.business_id = b.id
      AND s.dia_semana = :day_of_week
      AND s.cerrado_todo_el_dia = 0
      AND s.hora_apertura <= :time
      AND s.hora_cierre >= :time
  ));

```

### 5.2 Endpoints de Autenticación y Gestión de Cuenta (`auth.routes.js`)

| Método y Ruta | Historias Cubiertas | Descripción y Lógica | 
| ----- | ----- | ----- | 
| `POST /api/auth/register-request` | HU-01 | Recibe `multipart/form-data` con datos del estudiante, imagen opcional de credencial UNISON y datos base del emprendimiento. Crea usuario con `estado_cuenta = 'pendiente'` y perfil inicial en `businesses`. | 
| `POST /api/auth/login` | HU-40 | Autentica email/matrícula y contraseña. Devuelve token JWT, perfil del usuario, estado de su cuenta (`pendiente`, `aprobada`, `rechazada`, `suspendida`) y notificaciones no leídas. | 
| `GET /api/auth/request-status` | HU-27 | Consulta por `?email=` el estado actual de una solicitud de cuenta y el mensaje/notificación del administrador. | 
| `POST /api/auth/forgot-password` | HU-32 | Genera código de 6 dígitos en `password_reset_tokens` (expira en 15 min) y lo registra en consola/notificación local. | 
| `POST /api/auth/reset-password` | HU-32 | Recibe `{ email_institucional, codigo_recuperacion, nueva_password }`, valida vigencia y actualiza `password_hash`. | 
| `DELETE /api/auth/my-account` | HU-28 | Protegido con JWT. Verifica contraseña actual, marca `estado_cuenta = 'eliminada'`, apaga `esta_abierto = 0` y desactiva ubicación. | 

### 5.3 Endpoints Protegidos del Emprendedor (`my-business`)

Requieren cabecera `Authorization: Bearer <token>`, `rol === 'emprendedor'` y `estado_cuenta === 'aprobada'`. Cualquier mutación actualiza automáticamente `businesses.last_activity_at = CURRENT_TIMESTAMP` y `inactivo_oculto = 0`.

| Método y Ruta | Historias Cubiertas | Descripción y Cuerpo de Petición | 
| ----- | ----- | ----- | 
| `GET /api/my-business` | HU-34, HU-40 | Obtiene el perfil completo del emprendedor autenticado (incluyendo datos privados de ubicación, productos pausados/ocultos por admin y notificaciones). | 
| `PUT /api/my-business/profile` | HU-05, HU-06 | Actualiza `nombre_negocio`, `category_id` y `descripcion`. Regenera `slug` único si cambia el nombre. | 
| `PUT /api/my-business/photos` | HU-03, HU-04 | `multipart/form-data` con campos `foto_perfil` y/o `foto_menu`. Guarda en `/uploads/profiles/` y `/uploads/menus/`. | 
| `PATCH /api/my-business/open-status` | HU-17 | Recibe \`{ "esta_abierto": true | 
| `PUT /api/my-business/location` | HU-10, HU-12 | Recibe \`{ "mostrar_ubicacion": true | 
| `PUT /api/my-business/schedules` | HU-36 | Recibe arreglo de los 7 días `[{ dia_semana, hora_apertura, hora_cierre, cerrado_todo_el_dia }]` y reemplaza en transacción. | 
| `PUT /api/my-business/contacts` | HU-13 | Recibe arreglo `[{ tipo_contacto, valor, etiqueta, es_principal }]`, valida formatos y actualiza `business_contacts`. | 
| `POST /api/my-business/products` | HU-02, HU-07 | `multipart/form-data` con `nombre`, `descripcion`, `precio` e `imagen`. Crea producto con `estado = 'activo'`. | 
| `PUT /api/my-business/products/:id` | HU-07, HU-08 | Actualiza `nombre`, `descripcion`, `precio` e `imagen` opcional del producto. | 
| `PATCH /api/my-business/products/:id/pause` | HU-11 | Alterna el estado del producto entre `'activo'` y `'pausado'` (no permite reactivar un producto con `'oculto_admin'` sin editarlo primero). | 
| `DELETE /api/my-business/products/:id` | HU-09 | Marca `estado = 'eliminado'` para retirar el producto del catálogo. | 

### 5.4 Endpoints Protegidos de Administración (`admin.routes.js`)

Requieren cabecera `Authorization: Bearer <token>` y `rol === 'admin'`. Todas las acciones registran una fila en `audit_logs`.

| Método y Ruta | Historias Cubiertas | Descripción y Acción Administrativa | 
| ----- | ----- | ----- | 
| `GET /api/admin/requests` | HU-20B, HU-21 | Lista solicitudes de registro filtradas por `?status=pendiente|aprobada|rechazada|suspendida`. | 
| `PATCH /api/admin/requests/:userId` | HU-20B, HU-21, HU-27 | Recibe `{ "decision": "aprobada" | "rechazada", "motivo": "..." }`. Actualiza `users.estado_cuenta` y crea notificación en `notifications`. | 
| `PATCH /api/admin/users/:userId/suspend` | HU-22 | Recibe `{ "suspend": true | false, "motivo": "..." }`. Cambia `estado_cuenta` a `'suspendida'` (o la restaura a `'aprobada'`), apaga `esta_abierto = 0` y notifica al usuario. | 
| `PATCH /api/admin/products/:productId/moderate` | HU-20A | Recibe `{ "ocultar": true | false, "motivo_moderacion": "..." }`. Cambia `products.estado` a `'oculto_admin'` (o lo restaura a `'activo'`). | 
| `GET /api/admin/reports` | HU-35 | Lista todos los reportes enviados por consumidores con datos del negocio, producto involucrado y conteo histórico de reportes del negocio. | 
| `PATCH /api/admin/reports/:reportId` | HU-24 | Recibe `{ "estado_reporte": "en_revision" | "resuelto_con_sancion" | "desestimado", "notas_admin": "...", "accion_automatica": "ninguna" | "ocultar_producto" | "suspender_cuenta" }`. Ejecuta la resolución en una sola transacción SQLite. | 
| `POST /api/admin/categories` / `PUT /api/admin/categories/:id` | HU-16 | Crea o actualiza categorías del sistema (`nombre`, `slug`, `descripcion`, `icono`, `activa`). | 
| `POST /api/admin/maintenance/run-inactivity-check` | HU-25 (Sección 4.1) | Oculta automáticamente (`inactivo_oculto = 1`, `esta_abierto = 0`) los negocios sin actividad en los últimos $N$ días (por defecto 30 días). | 
| `POST /api/admin/maintenance/backup` | HU-25 (Riesgo R13) | Utiliza la API nativa `db.backup()` de `better-sqlite3` para generar un respaldo íntegro en `backend/database/backups/emprendebuho_YYYYMMDD_HHMMSS.sqlite`. | 

## 6. Especificación de Interfaz de Usuario (React) e Identidad Visual UNISON

### 6.1 Sistema de Diseño y Colores Institucionales (RNF-04)

El archivo `frontend/src/styles/index.css` debe definir las siguientes variables CSS basadas en la identidad oficial de la Universidad de Sonora:

```
:root {
  /* Colores Institucionales Universidad de Sonora (UNISON) */
  --unison-blue: #002D62;          /* Azul Marino Principal - Cabeceras, navegación, botones primarios */
  --unison-blue-light: #004B9B;    /* Azul Secundario - Estados hover, enlaces activos */
  --unison-gold: #F2A900;          /* Dorado Institucional - Acentos, insignias destacadas, estrellas */
  --unison-gold-soft: #FFF5D6;     /* Fondo suave para alertas informativas o destacados */

  /* Semántica de Estados de Negocio y Moderación */
  --status-open: #16A34A;          /* Verde Esmeralda - Negocio Abierto Ahora */
  --status-open-bg: #DCFCE7;
  --status-closed: #64748B;        /* Gris Pizarra - Negocio Cerrado */
  --status-closed-bg: #F1F5F9;
  --status-paused: #D97706;        /* Ámbar - Producto Pausado Temporalmente */
  --status-danger: #DC2626;        /* Rojo - Error, Reporte o Cuenta Suspendida */

  /* Superficies y Tipografía (WCAG AAA / AA >= 4.5:1) */
  --bg-canvas: #F8FAFC;
  --bg-card: #FFFFFF;
  --text-primary: #0F172A;
  --text-secondary: #475569;
  --border-subtle: #E2E8F0;
}

```

### 6.2 Mapa de Vistas y Flujos de Usuario en React

1. **Vista Pública de Exploración y Búsqueda (`/`, `/explorar`):**

   * **Cabecera UNISON:** Logo de EmprendeBúho, buscador global con conmutador *"Negocios"* / *"Productos"* (`HU-15`, `HU-37`), botón rápido de filtro **"Abiertos ahora"** (`HU-39`) con punto verde pulsante y acceso a **Favoritos** (`HU-31`) con contador.

   * **Carrusel de Categorías (`HU-19`) y Selector de Zona del Campus (`HU-23`):** Permite elegir en un clic una zona (ej. *Ciencias Exactas 3K*, *Plaza del Estudiante*, *Biblioteca*) o una categoría (*Repostería*, *Alimentos*, *Bisutería*).

   * **Barra de Filtros Avanzados y Ordenamiento (`HU-30`, `HU-33`, `HU-38`):** Modal o panel lateral con deslizador de rango de precios (`$0` a `$500+`), filtro por horario específico (*"Abiertos hoy a las..."* o *"Abiertos ahora mismo"*) y selector de ordenamiento (*Abiertos primero*, *Alfabético A-Z*, *Cercanía a mi zona seleccionada*).

   * **Cuadrícula Tipo Red Social (`HU-14`):** Tarjetas (`BusinessCard`) con foto de portada/menú o productos destacados, avatar circular del negocio (`HU-04`), insignia de categoría (`HU-05`), badge en tiempo real **ABIERTO / CERRADO** (`HU-17`), badge de zona del campus (solo si `mostrar_ubicacion === 1`, de lo contrario muestra *"Ubicación privada — Acordar por mensaje"*), rango de precios y botón de corazón para guardar en Favoritos (`HU-31`).

2. **Vista de Perfil Público del Emprendimiento (`/negocio/:slug` — `HU-18`):**

   * **Encabezado del Perfil:** Foto de perfil, nombre del negocio, categoría, descripción completa (`HU-06`), estado Abierto/Cerrado en tiempo real y ubicación aproximada (respetando `HU-12`).

   * **Barra de Acción Directa (`HU-29`):** Botones grandes optimizados para pulgar en móvil: **Enviar WhatsApp**, **Llamar por Teléfono**, **Instagram** y **Guardar en Favoritos**.

   * **Pestañas de Contenido:**

     * *Catálogo de Productos (`HU-02`, `HU-07`, `HU-11`):* Buscador interno y filtro de precio dentro del negocio; muestra cada producto con su foto, nombre, descripción y precio en MXN. Los productos con `estado = 'pausado'` muestran una etiqueta ámbar *"No disponible temporalmente"*.

     * *Foto del Menú (`HU-03`):* Si el emprendedor subió una imagen de menú general, se muestra con opción de zoom a pantalla completa.

     * *Horarios e Información (`HU-36`):* Tabla clara de Lunes a Domingo con el día actual resaltado en dorado UNISON.

   * **Pie de Perfil:** Enlace discreto *"¿Información falsa o contenido inapropiado? Reportar este negocio"* (`HU-26`) que abre `ReportModal.jsx`.

3. **Panel del Emprendedor (`/panel/*`):**

   * **Control Maestro Superior (`HU-17` y `HU-12`):** Dos interruptores siempre visibles en la parte superior del panel móvil y escritorio:

     1. **Estado del Negocio:** `🟢 Abierto (Atendiendo ahora)` vs `⚪ Cerrado`.

     2. **Visibilidad de Ubicación:** `📍 Mostrar mi zona en el campus` vs `🔒 Ubicación oculta (Privado)` + selector rápido de zona (`campus_zone_id`) y nota de referencia (*"En las bancas frente a..."*).

   * **Módulo Mi Perfil (`HU-03`, `HU-04`, `HU-05`, `HU-06`, `HU-13`):** Subida con previsualización instantánea de foto de perfil y foto de menú, selección de categoría, edición de descripción y lista dinámica de medios de contacto.

   * **Módulo Mi Catálogo (`HU-02`, `HU-07`, `HU-08`, `HU-09`, `HU-11`):** Lista de productos con interruptor individual para **Pausar / Reactivar** en un clic, botón de editar en modal y botón de eliminar con confirmación. Si un producto fue ocultado por un administrador (`estado = 'oculto_admin'`), muestra alerta roja con el `motivo_moderacion`.

   * **Módulo Horarios (`HU-36`):** Configuración semanal con casilla *"Cerrado todo el día"* e inputs de hora de apertura y cierre.

   * **Modo Vista Previa (`HU-34`):** Botón *"Ver cómo me ven los clientes"* que abre `/panel/vista-previa` renderizando exactamente la vista pública del consumidor.

   * **Zona de Peligro (`HU-28`):** Botón *"Cerrar mi negocio y eliminar mi cuenta"* con confirmación por contraseña.

4. **Panel de Administración (`/admin/*`):**

   * **Bandeja de Solicitudes de Registro (`HU-20B`, `HU-21`):** Tarjetas de aspirantes con visualización de matrícula, correo `@unison.mx`, foto de credencial adjunta y botones **Aprobar Cuenta** o **Rechazar con Motivo**.

   * **Centro de Reportes y Moderación (`HU-20A`, `HU-22`, `HU-24`, `HU-35`):** Tabla de reportes recibidos, visor rápido del negocio/producto denunciado y acciones integradas: *Ocultar Producto*, *Suspender Cuenta Temporalmente* o *Desestimar Reporte*.

   * **Gestor de Categorías (`HU-16`):** Tabla CRUD con contador de negocios asociados por categoría.

   * **Mantenimiento del Sistema (`HU-25`):** Botón para ejecutar el ocultamiento automático de negocios inactivos, botón para crear respaldo SQLite local y tabla de auditoría (`audit_logs`).

## 7. Guía de Configuración y Ejecución Paso a Paso para Agentes de Desarrollo

Para que los agentes de software construyan, verifiquen y levanten la plataforma sin ambigüedades, deben seguir exactamente esta secuencia de implementación:

### Paso 1: Inicialización del Backend (`backend/`)

1. Crear `backend/package.json` con las dependencias:

   * Producción: `express`, `better-sqlite3`, `cors`, `helmet`, `dotenv`, `bcryptjs`, `jsonwebtoken`, `multer`, `zod`, `slugify`.

   * Desarrollo: `nodemon`.

2. Configurar `backend/.env`:

   ```
   PORT=4000
   NODE_ENV=development
   JWT_SECRET=emprendebuho_unison_local_secret_key_2026
   JWT_EXPIRES_IN=7d
   DB_PATH=./database/emprendebuho.sqlite
   UPLOAD_DIR=./uploads
   INACTIVITY_DAYS_LIMIT=30
   
   ```

3. Implementar `backend/src/config/db.js` para que al arrancar el servidor:

   * Verifique que exista la carpeta `backend/database/` y `backend/database/backups/`.

   * Abra el archivo SQLite, ejecute `PRAGMA foreign_keys = ON;` y corra el contenido de `schema.sql`.

   * Si la tabla `users` está vacía (`SELECT COUNT(*) FROM users` es `0`), ejecute automáticamente `seed.sql` generando los hashes de las contraseñas demo con `bcryptjs`.

### Paso 2: Inicialización del Frontend (`frontend/`)

1. Crear el proyecto React con Vite en `frontend/` e instalar: `react-router-dom`, `lucide-react`, ` tailwindcss`, `postcss`, `autoprefixer`.

2. Configurar el proxy en `frontend/vite.config.js` para redirigir llamadas de API e imágenes al backend local sin problemas de CORS:

   ```
   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';
   
   export default defineConfig({
     plugins: [react()],
     server: {
       port: 5173,
       proxy: {
         '/api': 'http://localhost:4000',
         '/uploads': 'http://localhost:4000'
       }
     }
   });
   
   ```

### Paso 3: Reglas de Validación y Casos Borde Obligatorios

* **Validación de Registro UNISON (`HU-01`, `HU-20B`):** El correo debe ser un email válido (preferentemente terminación `@unison.mx`) y la matrícula debe aceptar el formato de expediente estudiantil de la Universidad de Sonora (9 dígitos numéricos, ej. `221200001`).

* **Validación de Horarios (`HU-36`, `HU-38`):** Si `cerrado_todo_el_dia === 0`, validar que `hora_apertura < hora_cierre` en formato `HH:MM` (ej. `08:00` a `19:00`).

* **Automatización de Inactividad (Sección 4.1 del Documento y `HU-25`):** Al iniciar el backend y cada 12 horas (además del botón manual en `/admin/mantenimiento`), el servicio `maintenance.service.js` debe marcar `inactivo_oculto = 1` y `esta_abierto = 0` en todos los negocios cuyo `last_activity_at` sea anterior a `datetime('now', '-30 days')`. Cuando el emprendedor vuelva a iniciar sesión o actualice su estado/catálogo, `inactivo_oculto` vuelve automáticamente a `0`.

* **Persistencia Resiliente de Favoritos (`HU-31`):** Si un negocio guardado en `localStorage` por el consumidor es posteriormente eliminado o suspendido, el endpoint `GET /api/businesses?ids=...` simplemente lo omitirá y el frontend sincronizará la vista sin arrojar errores.

### Paso 4: Lista de Verificación de Entrega (Definition of Done para los Agentes)

Antes de dar por concluida la construcción del software, el agente desarrollador debe comprobar que:

1. Un **Consumidor anónimo** (sin iniciar sesión) puede explorar el directorio, buscar por nombre de negocio o nombre de producto, filtrar por categoría, zona del campus, horario, rango de precio y estado abierto/cerrado, ordenar resultados, ver el perfil completo con foto de menú y catálogo, guardar favoritos en su navegador, abrir los enlaces de contacto directo (WhatsApp/Llamada/Redes) y enviar un reporte sobre un negocio.

2. Un **Emprendedor** puede solicitar su cuenta, consultar el estado de su solicitud, iniciar sesión una vez aprobado, recuperar su contraseña localmente, alternar en tiempo real entre **Abierto** y **Cerrado**, activar o desactivar su ubicación en el campus (comprobando que al desactivarla desaparece de las respuestas públicas de la API), editar su foto de perfil, foto de menú, descripción, categoría, horarios y medios de contacto, crear/editar/pausar/eliminar productos con precio e imagen, previsualizar su perfil como consumidor y dar de baja su cuenta.

3. Un **Administrador** puede iniciar sesión, aprobar o rechazar solicitudes pendientes de estudiantes UNISON, gestionar las categorías del sistema, revisar y resolver reportes enviados por consumidores, ocultar productos inapropiados, suspender temporalmente cuentas infractoras y ejecutar el mantenimiento y respaldo de la base de datos SQLite local.