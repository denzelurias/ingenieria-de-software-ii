# EmprendeBúho

Plataforma para descubrir emprendimientos de la comunidad de la Universidad de Sonora, campus Hermosillo. Permite consultar negocios y productos, contactar directamente a sus responsables y administrar perfiles, solicitudes y reportes. No incluye pagos, carritos ni logística de entregas.

Los importes se expresan en pesos mexicanos (MXN) y los horarios se calculan con la zona `America/Hermosillo`.

## Tecnologías y estado actual

Monorepo JavaScript con npm workspaces (`backend` y `frontend`):

- **Backend:** Node.js, Express 5 y SQLite mediante `better-sqlite3`, sin ORM. Autenticación JWT, contraseñas con `bcryptjs`, validación con Zod y archivos con Multer.
- **Frontend:** React 19, React Router 7, Vite, Tailwind CSS 4 mediante `@tailwindcss/vite` e iconos de Lucide.
- **Pruebas:** ejecutor integrado `node --test` y Supertest.

El repositorio contiene el backend de las fases F1, F2A y F2B y la base del frontend F2C: contextos, cliente API, navegación, layouts y componentes comunes. Las páginas completas de F3A, F3B y F3C siguen pendientes; algunas rutas muestran contenido provisional. La existencia de un endpoint no implica que su formulario o pantalla ya esté implementado.

## Requisitos previos

- Node.js **22.x o 24.x**, conforme a `backend/package.json`.
- npm **10 o superior** con soporte de workspaces.
- Git, si se clonará el repositorio.

Comprueba las versiones en la terminal:

```sh
node --version
npm --version
```

SQLite funciona como archivo local: no requiere instalar ni iniciar un servidor de base de datos separado. `better-sqlite3` es un módulo nativo; si no hay un binario precompilado compatible, su instalación requiere herramientas de compilación de C++.

## Instalación desde cero

Clona el fork y entra en la raíz, donde se encuentra el `package.json` que declara los workspaces:

```sh
git clone https://github.com/orlandopvz/ingenieria-de-software-ii.git
cd ingenieria-de-software-ii
npm install
```

Una sola instalación en la raíz instala las dependencias de ambos workspaces. No es necesario instalar Vite o nodemon globalmente.

### Variables de entorno

En una instalación nueva, copia la plantilla del backend. Desde la raíz, en PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
```

En Bash, el equivalente es:

```sh
cp backend/.env.example backend/.env
```

Si `backend/.env` ya existe, conserva su configuración en lugar de sobrescribirlo. Edita ese archivo antes de iniciar el servidor. Está ignorado por Git; la plantilla `.env.example` sí se versiona.

| Variable | Valor de la plantilla | Uso |
| --- | --- | --- |
| `PORT` | `4000` | Puerto HTTP del backend. |
| `NODE_ENV` | `development` | Entorno: `development`, `test` o `production`. |
| `CORS_ORIGIN` | `http://localhost:5173` | Origen permitido para el frontend. |
| `JWT_SECRET` | `cambia_esto_por_una_cadena_larga_y_aleatoria` | Sustituir por un secreto aleatorio de al menos 32 caracteres. |
| `JWT_EXPIRES_IN` | `7d` | Vigencia del token; número seguido de `s`, `m`, `h` o `d`. |
| `DB_PATH` | `./database/emprendebuho.sqlite` | Archivo SQLite. |
| `UPLOAD_DIR` | `./uploads` | Imágenes públicas. |
| `STORAGE_DIR` | `./storage` | Almacenamiento privado, incluidas credenciales. |
| `BACKUP_DIR` | `./database/backups` | Respaldos SQLite. |
| `BACKUP_KEEP` | `10` | Cantidad de respaldos que se conservan. |
| `ALLOWED_EMAIL_DOMAINS` | `unison.mx` | Dominios institucionales permitidos, separados por comas. |
| `INACTIVITY_DAYS_LIMIT` | `30` | Límite de días para el tratamiento de inactividad. |
| `MAINTENANCE_INTERVAL_HOURS` | `12` | Intervalo del mantenimiento programado. |
| `REPORT_IP_SALT` | `cambia_esto_tambien` | Sustituir por un valor aleatorio de al menos 16 caracteres para el hash de IP de reportes. |

Las rutas relativas se resuelven desde `backend/`. El directorio público de archivos no debe solaparse con la base de datos, los respaldos ni el almacenamiento privado. Nunca publiques los secretos ni copies las credenciales estudiantiles a `uploads/`.

El frontend funciona sin un archivo de entorno adicional: su cliente utiliza `/api`. La variable opcional existente `VITE_API_BASE_URL` permite cambiar esa base, pero no es necesaria con el proxy local. Cualquier variable `VITE_*` utilizada por el cliente es pública y no debe contener secretos.

### Inicializar SQLite y las semillas

Con el backend detenido, ejecuta desde la raíz:

```sh
npm run db:reset
```

**Este comando es destructivo:** recrea la base configurada y elimina los archivos de los directorios configurados de imágenes públicas y almacenamiento privado, salvo `.gitkeep`. Conserva el directorio de respaldos. Úsalo para una instalación nueva o cuando quieras descartar los datos locales, no como paso habitual de arranque.

El proceso aplica `backend/database/schema.sql` y carga `backend/database/seed.js`: 8 categorías, 9 zonas, 5 usuarios iniciales, 4 negocios, 9 productos, 2 reportes y sus horarios. Con la configuración predeterminada, el archivo resultante es `backend/database/emprendebuho.sqlite`.

El arranque normal también inicializa el esquema y, fuera de pruebas, carga las semillas si no hay usuarios. No borra los datos existentes ni sustituye una migración de esquema.

### Cuentas locales de demostración

Estas cuentas provienen de las semillas; no deben usarse como credenciales de producción. Se pueden utilizar con la API mientras se completan las pantallas de autenticación.

| Correo | Contraseña | Rol / estado |
| --- | --- | --- |
| `admin@unison.mx` | `AdminUnison2026!` | Administrador, aprobada. |
| `fernanda.demo@unison.mx` | `Buho2026!` | Emprendedor, aprobada. |
| `orlando.demo@unison.mx` | `Buho2026!` | Emprendedor, aprobada. |
| `nuevo.emprendedor@unison.mx` | `Buho2026!` | Emprendedor, pendiente. |
| `rechazado.demo@unison.mx` | `Buho2026!` | Emprendedor, rechazada. |

Los estados pendiente y rechazada tienen restricciones de acceso; no equivalen a una cuenta aprobada.

## Iniciar desde VS Code

Abre la carpeta raíz del repositorio en VS Code y selecciona **Terminal → Nueva terminal**. Después de configurar el entorno y la base, ejecuta:

```sh
npm run dev
```

Este script inicia backend y frontend en paralelo. Mantén la terminal abierta y utiliza `Ctrl+C` para detenerlos.

| Servicio | Dirección predeterminada |
| --- | --- |
| Aplicación React | http://localhost:5173 |
| API Express | http://localhost:4000/api |
| Comprobación del backend | http://localhost:4000/api/health |

El endpoint de salud devuelve un sobre JSON con `ok: true` y `data.estado: "disponible"` cuando el servidor está disponible.

Para iniciar cada servicio por separado, abre dos terminales en la raíz:

**Terminal del backend, con recarga mediante nodemon:**

```sh
npm run dev -w backend
```

**Terminal del frontend:**

```sh
npm run dev -w frontend
```

El backend también tiene un inicio sin recarga automática:

```sh
npm run start -w backend
```

No ejecutes simultáneamente dos instancias del backend en el mismo puerto.

Vite redirige `/api` y `/uploads` a `http://localhost:4000`, según `frontend/vite.config.js`. Usa `localhost` para mantener el origen configurado en CORS. Si cambias el puerto del backend, también debes ajustar el destino del proxy; cambiar solo `PORT` no actualiza Vite.

## Pruebas, compilación y scripts

Los siguientes comandos se ejecutan desde la raíz y corresponden a scripts existentes:

| Comando | Resultado |
| --- | --- |
| `npm run dev` | Inicia ambos servicios en desarrollo. |
| `npm test` | Ejecuta las pruebas del backend mediante `node --test "tests/**/*.js"`. |
| `npm run build` | Compila el frontend con Vite en `frontend/dist/`. |
| `npm run lint` | Ejecuta ESLint sobre `frontend/src`; actualmente falta su configuración, como se indica abajo. |
| `npm run db:reset` | Recrea SQLite y carga las semillas; elimina datos y archivos locales. |
| `npm run preview -w frontend` | Inicia la vista previa del bundle ya compilado; consulta la URL que imprime Vite. |

También puedes ejecutar `npm test` desde `backend/`, o `npm run build` desde `frontend/`. Las pruebas de integración usan el helper de bases temporales en `backend/tests/helpers/testApp.js`.

La compilación genera los archivos del frontend; no inicia el backend. El servidor Express actual no publica automáticamente `frontend/dist/`. La vista previa de Vite tampoco sustituye una configuración de despliegue de ambos servicios.

**Limitación verificada:** `npm run lint` falla porque no existe un archivo `eslint.config.*`. El script está declarado, pero falta completar su configuración en una tarea posterior. Este README no modifica esa configuración ni presenta el lint como aprobado.

## Estructura del repositorio

```text
ingenieria-de-software-ii/
├── AGENTS.md
├── README.md
├── package.json                 # Scripts comunes y workspaces
├── package-lock.json
├── especificacion_tecnica_emprendebuho.md
├── docs/                        # Arquitectura, datos, fases y decisiones
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── database/
│   │   ├── schema.sql           # DDL oficial
│   │   ├── seed.js
│   │   └── backups/
│   ├── uploads/                 # profiles/, menus/, products/: públicos
│   ├── storage/credentials/     # Credenciales estudiantiles privadas
│   ├── src/
│   │   ├── config/
│   │   ├── middlewares/
│   │   ├── validators/
│   │   ├── repositories/
│   │   ├── services/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   └── tests/                   # Integración y helpers
└── frontend/
    ├── package.json
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── styles/
        ├── context/
        ├── hooks/
        ├── utils/
        ├── services/api.js
        └── components/
            ├── common/
            ├── layout/
            └── routing/
```

Las dependencias, los bundles, los archivos `.env`, las bases locales, los respaldos y los archivos subidos están ignorados por Git. Las plantillas `.env.example` y los archivos `.gitkeep` se conservan.

## Solución de errores comunes

| Problema | Revisión o solución |
| --- | --- |
| `Missing script` o workspace no encontrado | Comprueba que la terminal está en la raíz con el `package.json` que declara `backend` y `frontend`. Usa los comandos de este README. No existe un script `start` en la raíz. |
| No se encuentra Vite, nodemon o un módulo | Ejecuta `npm install` desde la raíz con Node.js 22.x o 24.x y npm ≥ 10. |
| Fallo al instalar o cargar `better-sqlite3` | Comprueba la versión de Node y reinstala las dependencias con `npm install` tras cambiarla. Si la instalación requiere compilar el módulo nativo, revisa las herramientas C++ y el error de instalación. |
| Configuración de entorno inválida | Crea `backend/.env` desde la plantilla, revisa los nombres de variables indicados por el servidor y cumple las longitudes de los secretos y los valores numéricos positivos. |
| Puerto ocupado / `EADDRINUSE` | Detén la instancia anterior con `Ctrl+C`. Si Vite elige otro puerto, libera el 5173 y reinicia para mantener el origen CORS predeterminado. |
| Error CORS | Abre `http://localhost:5173` y comprueba `CORS_ORIGIN`. `127.0.0.1`, otro puerto o HTTPS constituyen un origen distinto. Reinicia el backend después de cambiar su `.env`. |
| Error de proxy o API inaccesible | Comprueba que el backend siga ejecutándose y abre `/api/health` en el puerto 4000. Revisa que el proxy coincida con el puerto real del backend. |
| Base bloqueada, sin permisos o reset fallido | Detén el backend y cualquier herramienta que mantenga abierta SQLite. Comprueba permisos y rutas antes de repetir un reset, que elimina datos. |
| Un contacto de un carácter falla en una base antigua | Consulta la migración de la sección 7 de `docs/especificacion-base-de-datos.md`. Inicializar el servidor no modifica un `CHECK` de una tabla existente. No restablezcas una base con datos que necesites conservar. |
| Una cuenta de semillas no puede operar | Comprueba su rol y estado. Las cuentas pendientes o rechazadas no tienen los permisos de una cuenta aprobada. |
| Una página muestra contenido provisional | La base F2C está implementada; las páginas funcionales de F3A/F3B/F3C están pendientes. |
| ESLint no encuentra `eslint.config.*` | Es una limitación actual del repositorio. El script existe, pero la configuración todavía debe incorporarse. |

## Documentación de referencia

- [Reglas operativas](AGENTS.md).
- [Especificación técnica maestra](especificacion_tecnica_emprendebuho.md).
- [Plan de construcción y alcance por fase](docs/plan-de-construccion.md).
- [Arquitectura](docs/especificacion-arquitectura.md).
- [Base de datos y migración de contactos](docs/especificacion-base-de-datos.md).
- [Decisiones técnicas](docs/decisiones-tecnicas.md).
