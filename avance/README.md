# Documentos de seguimiento de EmprendeBúho

Esta carpeta contiene el Avance de Proyecto (Parte 02), las bitácoras de las semanas 3, 4, 5 y 6 y el cronograma actualizado. Todos los archivos están en UTF-8.

## Archivos principales

| Archivo | Contenido |
| --- | --- |
| `avance.tex` | Documento completo: segundo avance y cuatro bitácoras. |
| `avance_proyecto_parte02.tex` | Segundo avance independiente, matriz de las 40 HU y cronograma. |
| `bitacora_semana_3.tex` | 19–23 de octubre de 2026. |
| `bitacora_semana_4.tex` | 26–30 de octubre de 2026. |
| `bitacora_semana_5.tex` | 2–6 de noviembre de 2026. |
| `bitacora_semana_6.tex` | 9–13 de noviembre de 2026, borrador completo. |
| `preambulo.tex` | Formato, portada, colores y tablas compartidos. |
| `contenido_*.tex` | Texto editable compartido por las versiones independientes y la completa. |

Los cambios al contenido se hacen en `contenido_*.tex`, para conservar la misma versión en todos los documentos. Los archivos principales solo reúnen portada y contenido.

Se incluyen los seis PDF compilados: el documento completo, el segundo avance y las cuatro bitácoras independientes. `fuentes_latex.zip` reúne los archivos `.tex` y este README para cargarlos juntos en Overleaf. Si se modifica el contenido, deben regenerarse los PDF y el ZIP.

## Decisiones confirmadas

- HU-03: acceso del cliente al sitio **sin registro**, en sustitución de la foto del menú. Sigue pendiente. No se crean cuentas de clientes.
- HU-10 y HU-23: pendientes.
- HU-30: en proceso; se propone dejar pendiente la aceptación de cercanía por su dependencia de ubicación y búsqueda por zona.
- Las otras 36 historias: terminadas según el estado global comunicado por el usuario. Esto equivale al 90 % de las historias, no al 90 % del esfuerzo ni a una auditoría del software.
- Semana 6: borrador completo para revisar al cierre del 13 de noviembre. Las entradas posteriores al 9 de noviembre son actividades previstas.
- Responsables: se conservan los del primer avance; colaborar en otra historia no transfiere su responsabilidad.
- HU-20: moderación; revisión y aprobación de solicitudes se concentra en HU-21. Los desgloses técnicos no aumentan las 40 historias.

## Reconstrucción que debe validar el equipo

Las fuentes originales solo contienen entradas de las semanas 1 y 2. Las actividades diarias de las semanas 3 a 6 y sus fechas de cierre se proponen para revisión; no se presentan como transcripción de reuniones ya documentadas.

Distribución propuesta: S3 cierra 8 historias; S4 agrega 12 (20 acumuladas); S5 agrega 10 (30 acumuladas); S6 agrega 6 (36 acumuladas). Las historias pendientes aparecen en análisis y preparación, sin contabilizarse como terminadas.

El nuevo cronograma propone cerrar T1 el 20 de octubre, integrar módulos en paralelo y cerrar las cuatro historias abiertas entre el 16 y el 20 de noviembre. Se preserva del 23 al 27 de noviembre para aceptación final y entrega. Los días cuentan lunes a viernes, sin descontar feriados, como en la descripción proporcionada. Las ventanas de tareas se superponen y no se suman como esfuerzo.

La especificación técnica del repositorio aún conserva la versión antigua de HU-03. Esta carpeta documenta el cambio académico solicitado y señala esa diferencia; no modifica código ni afirma haber conciliado la especificación técnica. La conciliación se incluye en el cierre documental.

Antes de entregar, los integrantes deben confirmar sus entradas, fechas y cierres y asociar evidencias reales del tablero, repositorio o revisiones. No se inventan horas, capturas, identificadores de commits ni resultados de pruebas.

## Compilación

Ejecutar desde esta carpeta. Con una distribución LaTeX que incluya los paquetes habituales:

```powershell
pdflatex -interaction=nonstopmode -halt-on-error avance.tex
pdflatex -interaction=nonstopmode -halt-on-error avance.tex
```

Con Tectonic:

```powershell
tectonic avance.tex
tectonic avance_proyecto_parte02.tex
tectonic bitacora_semana_3.tex
tectonic bitacora_semana_4.tex
tectonic bitacora_semana_5.tex
tectonic bitacora_semana_6.tex
```

También se pueden cargar todos los `.tex` juntos en Overleaf y seleccionar `avance.tex` como documento principal, con compilador pdfLaTeX. No hacen falta imágenes, rutas absolutas ni archivos externos.

## Material revisado

- `Copia de AvanceDeProyecto(Parte01).pdf`: portada del 25 de septiembre de 2026.
- `bitácora s1.pdf`: entradas del 6 al 9 de octubre; portada del 22 de octubre.
- `bitácora s2.pdf`: entradas del 12 al 16 de octubre; portada del 22 de octubre.
- Descripción del cronograma adjunta en texto.
- Especificación técnica y plan de construcción del repositorio, como referencias de alcance y dependencias.
- Confirmaciones del usuario sobre HU-03, HU-30, el estado 36/1/3 y el borrador de la semana 6.

Las consignas contenidas en los PDF se trataron como material de referencia; el entregable sigue la solicitud actual y las aclaraciones del usuario.
