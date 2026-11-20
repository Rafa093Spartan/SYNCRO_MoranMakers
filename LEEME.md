# SYNCRO 2.0 · UACAM Planner

**Moran Makers · Prototipo académico funcional · Noviembre de 2026**

SYNCRO permite mostrar el circuito de información **Jefatura de carrera → revisión del Excel → Control Escolar → publicación → consulta y planificación estudiantil**, planteado en el DRS-001 y SRS-002. La interfaz es web, adaptable a computadoras y teléfonos, y funciona con un pequeño servidor local en Python.

> **ATENCIÓN:** esta versión no es un servicio oficial de la UACAM. No se conecta con sistemas reales, no inscribe alumnos, no autentica usuarios con cuentas institucionales y **no debe utilizarse con datos personales o archivos académicos confidenciales**. Los perfiles y permisos se simulan en la interfaz para exponer el flujo de trabajo. La API no tiene controles de acceso de producción.

## 1. Arrancar en Windows

1. Descomprime el ZIP y abre la carpeta `SYNCRO_Prototipo_v2`.
2. Instala **Python 3.10 o superior** desde <https://www.python.org/downloads/> y activa la opción *Add Python to PATH*.
3. Haz doble clic en **`INICIAR_SYNCRO.bat`**. Si `openpyxl` no está instalada, se instalará la primera vez con conexión a internet.
4. Abre **http://127.0.0.1:8765** en Chrome, Edge o Firefox.
5. Mantén abierta la consola del servidor durante la demostración. Para detenerlo, pulsa **Ctrl+C**.

### Desde Visual Studio Code

Abre la carpeta completa, entra a **Terminal → Nueva terminal**, y ejecuta:

```powershell
python -m pip install -r requirements.txt
python server.py
```

Si tu PC utiliza el comando `py` en lugar de `python`, sustituye `python` por `py -3`. En Linux/macOS puedes usar `python3` y `INICIAR_SYNCRO.sh`.

**No abras `web/index.html` con doble clic**: la aplicación necesita la API del servidor. Si el puerto 8765 está ocupado, cierra la instancia anterior o configura `SYNCRO_PORT` desde la terminal.

## 2. Qué puedes demostrar en la versión 2.0

| Área | Funcionalidades disponibles |
|---|---|
| Planificador | Buscar y filtrar cursos, seleccionar grupos completos con sesiones múltiples, calendario de lunes a viernes o sábado, colores y detalles, bloqueo de cruces, alertas de traslado y métricas semanales |
| Borradores | Crear y recuperar varios planes por perfil ficticio; borrar, exportar CSV e imprimir/guardar como PDF desde el navegador |
| Alternativas | Algoritmo que busca hasta 3 combinaciones sin cruces a partir de las materias marcadas. Se puede priorizar tiempo libre, días de asistencia o inicio temprano. No es IA ni garantiza una solución |
| Horarios publicados | Vista tabla/calendario, filtros de búsqueda por carrera y otros campos, consulta de versiones anteriores y exportación CSV |
| Administración | Subida y validación de Excel, detección de traslapes de docente/aula/grupo, creación y cancelación de propuestas, aprobación/publicación y bitácora |
| Estadísticas | Distribución experimental de selecciones en borradores y gráficos por carrera; no representa matrícula o disponibilidad real |
| Interfaz | Tema claro/oscuro, menú plegable, mensajes de estado y adaptación a pantallas pequeñas |

## 3. Los archivos Excel incluidos

En la carpeta `ejemplos/` hay cuatro hojas de cálculo. También pueden descargarse desde **Administración**:

- `SYNCRO_plantilla.xlsx`: columnas requeridas, sin datos.
- `SYNCRO_ejemplo_con_errores.xlsx`: contiene errores intencionados, para demostrar la validación.
- `SYNCRO_ejemplo_valido.xlsx`: conjunto original de 12 asignaciones, sin cruces administrativos.
- **`SYNCRO_ejemplo_ampliado.xlsx`**: 18 asignaciones de prueba, con grupos alternativos y asignaturas que se imparten en más de un día. **Usa este para la demostración de 2.0.**

Columnas obligatorias: `periodo`, `carrera`, `semestre`, `grupo`, `materia`, `docente`, `salon`, `campus`, `dia`, `inicio`, `fin`, `capacidad`.

Límites de carga actuales: **.xlsx, 3 MB, 500 filas**. Los encabezados y formatos deben respetar la plantilla.

## 4. Demostración completa en 7 acciones

1. Selecciona **Jefatura de carrera** en el menú superior y abre **Administración**.
2. Descarga y sube el **Excel con errores**. Haz clic en **Validar archivo**. Explica por qué un archivo defectuoso no puede publicarse.
3. Elige **Excel ampliado · grupos alternativos**, cárgalo y haz clic en **Validar archivo** y después **Crear propuesta**.
4. Cambia a **Control Escolar** y haz clic en **Aprobar y publicar**. Observa el incremento de versión.
5. Visita **Horarios publicados**; prueba filtros, modo calendario y selección de versión anterior.
6. Cambia a **Estudiante**, abre **Mi planificador**, filtra por **Ingeniería de Software (DEMO)**. Agrega **Bases de Datos · grupo 5A**: aparecerán dos sesiones (lunes y miércoles). Intenta añadir **Redes de Computadoras · 5B**: se rechaza por choque del lunes. Agrega **Desarrollo Web · 5A**: aparece aviso de traslado entre campus con sólo 10 minutos de margen.
7. Guarda el borrador como **Plan A**. Marca **Bases de Datos** y **Redes de Computadoras** en el generador de alternativas. Elige **Generar opciones**, utiliza una alternativa y guárdala como **Plan B**. Abre **Estadísticas del piloto** para mostrar los contadores.

Para simular varios estudiantes, cambia entre **Alumno demo 01, 02 y 03** y guarda diferentes borradores. Los datos se almacenan localmente en SQLite.

## 5. Verificar el funcionamiento

En una terminal abierta en la carpeta:

```bash
python -m unittest discover -s tests -v
```

Se incluyen **14 pruebas** que cubren la funcionalidad de la versión original y las nuevas características: importación, versiones, cancelaciones, sesiones múltiples, generador de alternativas, guardado por perfil y protección contra selecciones inválidas.

También se verificó mediante navegación automatizada el flujo: Excel ampliado → validar → importar → publicar → planificar → generar alternativas.

## 6. Límites de la versión académica

**Sí demuestra:** el modelo de datos, detección básica de conflictos, guardado de borradores, validación de Excel, publicación y consulta desde una fuente única dentro de la demo.

**No demuestra:** autenticación institucional, permisos del lado del servidor, conexión a Control Escolar, matrícula, cupos reales, criptografía aplicada a expedientes, estimaciones geográficas de traslado, requisitos de planes de estudio oficiales, rendimiento con miles de usuarios ni una aplicación móvil nativa.

La regla de traslado de **20 minutos** es una convención para la demo. El cálculo automático de alternativas tiene límites de tamaño para mantener su respuesta rápida y puede no hallar solución si las preferencias son incompatibles.

## 7. Estructura del proyecto

```text
SYNCRO_Prototipo_v2/
├── INICIAR_SYNCRO.bat         # doble clic en Windows
├── INICIAR_SYNCRO.sh          # macOS / Linux
├── PROBAR_SYNCRO.bat          # ejecutar pruebas
├── server.py                  # servidor y API Python + SQLite
├── requirements.txt           # lector de archivos Excel
├── web/
│   ├── index.html             # estructura de la interfaz
│   ├── style.css              # temas, calendario y responsive
│   └── app.js                 # navegación, estados y formularios
├── ejemplos/                  # plantillas y datos ficticios
├── data/                      # base generada al ejecutar
├── docs/                      # alcance, guion y capturas
├── tests/                     # 14 pruebas automatizadas
└── presentacion/              # diapositivas para la exposición
```

**Para restablecer el entorno:** en Administración pulsa **Restablecer datos de demo**. Otra opción es cerrar el servidor, eliminar `data/syncro_demo.sqlite3` y volverlo a iniciar. Esta acción borra propuestas y borradores de prueba creados localmente.
