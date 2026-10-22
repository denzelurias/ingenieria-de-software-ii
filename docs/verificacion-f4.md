# Verificación de integración F4

Fecha: 22 de octubre de 2026. Rama: `codex/fase-4-integracion-final`.

## Diagnóstico y correcciones

El diagnóstico inicial encontró 57 pruebas del backend aprobadas y compilación correcta. El lint fallaba por ausencia de configuración; el README aún describía los paneles implementados como pendientes. Las rutas públicas, de autenticación, emprendedor y administrador ya estaban montadas en `frontend/src/App.jsx` y `backend/src/routes/index.js`.

Se incorporaron configuración ESLint con comprobación de referencias JSX y pruebas reproducibles de integración del cliente API y navegador, sin agregar dependencias. Los recorridos detectaron y permitieron corregir tres problemas: el enfoque del contenedor principal podía interrumpir la escritura; cancelar una descarga privada generaba un error de servidor innecesario; y eliminar la cuenta podía redirigir al inicio de sesión por una carrera entre navegación y cierre de sesión. También se ampliaron los objetivos táctiles del mapa conservando su apariencia y coordenadas.

La instalación limpia detectó que npm 11.19 intentaba compilar `better-sqlite3@13.0.3` mediante node-gyp pese a que este paquete incluye binarios precompilados. Se añadió una política limitada a esa versión y se verificó SQLite después de instalar. La justificación y los límites están en `decisiones-tecnicas.md`, F4-01. No se modificaron el esquema SQL ni los contratos REST.

## Resultados ejecutados

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 58 pruebas backend y 2 frontend aprobadas; 0 fallos |
| `npm run build` | Correcto, Vite: 2003 módulos; JavaScript 399.37 kB y CSS 31.62 kB |
| `npm run lint` | Correcto, sin errores |
| `npm run test:e2e` | Correcto; recorridos completos de los tres roles en navegador headless; sin excepciones ni errores de consola de la aplicación |
| Regresión E2E `--account-only` | Correcta: eliminación persistida, sesión eliminada y navegación a `/` |
| `git diff --check` | Correcto |

Las pruebas nuevas están en `frontend/tests/integration.test.js`, `frontend/tests/browser.e2e.mjs` y `backend/tests/file-response.test.js`. El test del cliente utiliza el código API real contra Express y SQLite temporales. La prueba de archivos distingue cancelación esperada, archivo inexistente y otros errores.

### Instalación nueva

Se copiaron los archivos del proyecto a `C:\Users\DGSSP\AppData\Local\Temp\emprendebuho-f4-install-dg278j`, sin copiar `.env`, bases existentes ni archivos privados. Entorno comprobado: Windows x64, Node.js 24.21 y npm 11.19.

1. `npm install`: correcto, 279 paquetes agregados; una segunda ejecución confirmó la instalación actualizada.
2. Se creó `backend/.env` desde su ejemplo, con secretos exclusivos de prueba.
3. `npm run db:reset`: correcto, solo en la copia. Consulta SQLite posterior: **8 categorías, 9 zonas y 5 usuarios**. Se comprobó también SQLite en memoria, versión 3.53.4.
4. `npm run dev`: inició frontend en `http://localhost:5173` y backend en `http://localhost:4000`. Frontend HTTP 200; `/api/health` respondió `ok: true` y `estado: disponible`.
5. Se detuvieron los servidores de la copia al finalizar.

Los tres comandos se ejecutaron desde la raíz. La configuración del `.env` es un paso previo obligatorio al reinicio y arranque. No se reinició la base de trabajo del usuario.

## Recorridos por rol

**Consumidor:** exploración, búsqueda sin acentos, categorías, zonas fijas y móvil, limpieza de selección, precios, horarios con cierre excluido, orden, paginación, perfil, productos, menú, contactos visibles, favoritos y reporte con validación de motivo. Se comprobaron controles móviles de 360 px y navegación de escritorio desde 768 px.

**Emprendedor:** solicitud y consulta de estado sin datos personales en la URL; acceso pendiente; inicio de sesión tras aprobación; perfil, contactos, fotografías, productos con imagen obligatoria, precio, pausa y eliminación; horarios válidos e inválidos; ubicación privada; controles de apertura y ubicación desde las siete subrutas del panel; vista previa; notificaciones individuales y masivas; recuperación de contraseña y eliminación de cuenta con cierre de sesión.

**Administrador:** autenticación, credencial recibida mediante petición protegida y presentada como Blob, aprobación y rechazo, categorías, resolución de reportes con y sin sanción, suspensión y reactivación, ocultamiento de producto, corrección por emprendedor y restauración, mantenimiento explícito, descarga efectiva de respaldo con cabecera `SQLite format 3`, consulta y filtro de auditoría. Se verificó el panel también a 360 px, sin desbordamiento horizontal.

Las suites HTTP complementan estos recorridos: permisos, revocación de JWT, privacidad de ubicación y credenciales, transacciones con auditoría, tratamiento de inactividad, archivos huérfanos y errores seguros. El mantenimiento del navegador usa únicamente datos temporales y no se ejecuta automáticamente al abrir su página.

## Trazabilidad de historias

Estado: las historias tienen implementación disponible y evidencia automatizada. **A** identifica las suites HTTP/backend del plan; **E** identifica el recorrido principal en navegador F4. Esto no implica cobertura exhaustiva de todas las combinaciones de cada historia. Los nombres abreviados de suites corresponden a `backend/tests/*.test.js`.

La matriz del plan enumera 41 filas técnicas: HU-01 a HU-40, desdoblando HU-20 en HU-20A y HU-20B. Su encabezado dice 42; aquí se conservan todos sus identificadores sin inventar una fila adicional.

| Historia | Funcionalidad disponible | Evidencia ejecutada |
| --- | --- | --- |
| HU-01 | Solicitud de registro | A: auth; E: registro, pendiente y aprobación |
| HU-02 | Alta de producto | A: my-business; E: alta con imagen |
| HU-03 | Imagen de menú | A: my-business; E: carga y visor |
| HU-04 | Foto de perfil | A: my-business; E: carga y eliminación |
| HU-05 | Categoría del negocio | A: my-business; E: edición de perfil |
| HU-06 | Datos del negocio | A: my-business; E: nombre y descripción |
| HU-07 | Datos y precio del producto | A: my-business; E: formulario |
| HU-08 | Edición de producto | A: my-business; E: edición y corrección moderada |
| HU-09 | Eliminación de producto | A: my-business; E: confirmación y eliminación |
| HU-10 | Ubicación | A: my-business; E: configuración |
| HU-11 | Disponibilidad de producto | A: my-business; E: pausa |
| HU-12 | Privacidad de ubicación | A: businesses.public y my-business; E: controles y vista previa |
| HU-13 | Contactos | A: my-business; E: edición |
| HU-14 | Directorio público | A: businesses.public; E: exploración y paginación |
| HU-15 | Búsqueda de negocios | A: businesses.public; E: búsqueda sin acentos |
| HU-16 | Gestión de categorías | A: admin; E: creación y desactivación |
| HU-17 | Abierto/cerrado | A: my-business; E: alternancia desde siete subrutas |
| HU-18 | Perfil público | A: businesses.public; E: detalle y menú |
| HU-19 | Filtro de categoría | A: businesses.public; E: selección |
| HU-20A | Moderación de productos | A: admin; E: ocultar, corregir y restaurar |
| HU-20B | Solicitudes y credenciales | A: admin; E: visualización autenticada y aprobación |
| HU-21 | Resolución de solicitudes | A: admin; E: aprobación y rechazo |
| HU-22 | Suspensión de cuentas | A: admin; E: suspensión y reactivación |
| HU-23 | Zonas del campus | A: businesses.public; E: mapa, móvil y limpiar |
| HU-24 | Resolución de reportes | A: admin; E: tres decisiones |
| HU-25 | Mantenimiento y auditoría | A: admin; E: ejecución, respaldo descargado y auditoría |
| HU-26 | Reporte de negocio | A: reports; E: anónimo y motivo inválido |
| HU-27 | Estado y notificaciones | A: auth y admin; E: estado, lectura individual y masiva |
| HU-28 | Baja de cuenta | A: auth; E: baja, sesión y redirección |
| HU-29 | Contacto directo | A: businesses.public; E: enlaces visibles desde perfil |
| HU-30 | Ordenamiento | A: businesses.public; E: orden y selector de proximidad |
| HU-31 | Favoritos | A: businesses.public; E: agregar y consultar |
| HU-32 | Recuperación de contraseña | A: auth; E: recuperación, cambio y nuevo acceso |
| HU-33 | Filtro de precios | A: businesses.public; E: límites en filtros |
| HU-34 | Vista previa fiel | A: my-business; E: vista previa con componente público compartido |
| HU-35 | Consulta de reportes | A: admin; E: listado |
| HU-36 | Horarios | A: my-business; E: siete días y validación |
| HU-37 | Búsqueda de productos | A: businesses.public; E: búsqueda y resultados |
| HU-38 | Disponibilidad por horario | A: businesses.public; E: día/hora y cierre excluido |
| HU-39 | Filtro abierto ahora | A: businesses.public; control frontend implementado, sin interacción específica de este filtro en E2E F4 |
| HU-40 | Sesión y roles | A: auth; E: accesos, cierre y rutas protegidas |

## Evidencia visual y límites

Se inspeccionaron las cuatro capturas producidas por la ejecución completa: `consumidor-360.png`, `emprendedor-360.png`, `administrador-1280.png` y `administrador-360.png`. Ubicación de esa ejecución: `C:\Users\DGSSP\AppData\Local\Temp\emprendebuho-e2e-l0vY8w`. El respaldo descargado está en su subdirectorio `downloads`. Son artefactos temporales, no archivos del repositorio. Las bases y credenciales de las fixtures se eliminan al cerrar las pruebas.

La interacción fue automatizada en navegador headless autorizado; la inspección de capturas fue visual. No se realizó una sesión manual completa, pruebas en dispositivos físicos ni con lector de pantalla. Se verificaron enlaces de contacto y visibilidad en pantalla; no se enviaron mensajes ni llamadas a servicios externos. La instalación no se verificó en otros sistemas operativos o versiones de Node.

## Seguridad, pendientes y aceptación

`git check-ignore` confirmó la exclusión de `.env`, SQLite, respaldos y rutas de credenciales y uploads. Los archivos rastreados no contienen las bases o credenciales usadas en las pruebas. No se hicieron commits, pushes, Pull Requests ni cambios de rama.

`npm audit --json` informó **3 alertas altas** en la cadena de desarrollo `nodemon → chokidar → braces`, asociada a [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). La corrección automática propuesta retrocede a nodemon 1.14.10; no se aplicó `audit fix --force`. Queda pendiente resolver esa cadena con una actualización compatible. La instalación fue correcta, pero no está libre de alertas de auditoría.

Se cumplen los tres criterios ejecutables de aceptación F4: suite completa con cero fallos, build y lint correctos, y README actualizado con instalación comprobada, cuentas de demostración y arquitectura. Los recorridos críticos de los tres roles quedaron automatizados. Las limitaciones anteriores permanecen explícitas y no se consideran verificaciones realizadas.
