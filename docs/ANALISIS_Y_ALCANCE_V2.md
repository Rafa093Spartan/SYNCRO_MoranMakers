# SYNCRO 2.0 — Alcance, decisiones y trazabilidad

## Necesidad documentada

El DRS-001 del equipo y el SRS-002 explican la necesidad de organizar cargas académicas, evitar cruces de horarios, unificar las versiones publicadas y facilitar el trabajo de Jefatura de Carrera y Control Escolar. La presentación inicial resalta la circulación de archivos Excel con versiones contradictorias.

## MVP implementado

- **Entrada de información:** Excel validado desde un panel administrativo local.
- **Revisión:** reglas para impedir docente/aula/grupo simultáneos, duplicados y campos incorrectos.
- **Publicación:** crear una nueva versión consultable sin borrar la anterior.
- **Consulta:** filtros, calendario, historial y exportación de datos de prueba.
- **Alumno:** seleccionar secciones académicas, visualizar horario, evitar cruces, obtener advertencias y guardar varios borradores.
- **Asistencia a la planeación:** algoritmo que ensaya combinaciones de grupos sin cruces cuando existen opciones.
- **Análisis experimental:** conteo de selecciones de los últimos borradores guardados en la demo.

## Matriz de trazabilidad

| Requisito fuente | Interpretación | Estado del prototipo |
|---|---|---|
| DRS RF-001 | Autenticación con matrícula y correo institucional | **No implementado**. Solo perfiles ficticios para simular pantallas; acceso real requiere integración institucional |
| DRS RF-002 | Simulador y borradores de horarios | **Implementado para demo**. Selección de grupos, múltiples días y borradores locales |
| DRS RF-003 / SRS RF-003-V2 | Alertas por cruces y traslado | **Implementado parcialmente**. Cruces reales de bloques y umbral fijo de 20 min, sin rutas reales |
| DRS RF-004 | Cargar y validar Excel | **Implementado para demo**. Máximo 3 MB/500 filas, revisión de formato y superposiciones |
| DRS RF-005 | Aprobación/publicación centralizada | **Implementado en el entorno local**, no protegido por autenticación de producción |
| SRS RF-010 | Revisión de salones y docentes | **Implementado** con detección de intervalos superpuestos |
| SRS RF-011 | Estadística y propuestas de cupos en tiempo real | **Parcial**: contadores de simulaciones locales; no hay pronóstico ni cupos oficiales |
| DRS no funcional: seguridad | Cifrado y acceso autorizado | **Pendiente**. No conectar datos reales a este prototipo |
| DRS no funcional: escalabilidad | Crecimiento a carreras/campus | **Arquitectura de capas demostrativa**. Sin ensayos de carga en producción |

## Decisiones de diseño

1. Se utiliza **una aplicación web adaptable** que sirve para mostrar ambos recorridos, en vez de desarrollar simultáneamente una app móvil nativa y un portal independiente.
2. La capa de presentación es HTML/CSS/JavaScript, la lógica es Python y la persistencia SQLite; esta es una implementación sencilla de las tres capas planteadas en el DRS y el SRS.
3. El prototipo siempre exhibe la condición **"académico / datos ficticios"** para evitar confundirse con un servicio institucional autorizado.
4. Cuando una materia tiene más de una sesión semanal, el planificador exige seleccionar todas las sesiones de esa sección.
5. La información administrativa pasa por un proceso de validación previo a la publicación. Cada publicación crea un nuevo registro de versión.
6. Los planes guardados de una versión anterior se marcan como desactualizados y no se vuelven válidos automáticamente.
7. El algoritmo de alternativas utiliza búsqueda combinatoria y restricciones deterministas; no emplea modelos de IA ni inventa cursos.

## Riesgos y trabajo pendiente antes de un despliegue institucional

- Documentar y validar formalmente el tratamiento de datos personales y permisos con responsables reales de la UACAM.
- Sustituir los roles simulados por autenticación y autorización aplicadas por el servidor.
- Implementar control de acceso por carrera/campus, sesiones seguras, auditoría identificada, cifrado y respaldos institucionales.
- Integrar catálogos, docentes, edificios, periodos, grupos y cupos oficiales mediante interfaces autorizadas.
- Añadir cambios de horario controlados, correcciones de versiones y reglas de carga académica por plan de estudios.
- Definir métricas medibles de rendimiento, resiliencia, accesibilidad y disponibilidad, y realizar pruebas de carga.
- Realizar pruebas con estudiantes y personal académico antes de ampliar el alcance.

## Límites de la exposición

En 10 minutos, no intentes demostrar todos los filtros. El éxito es demostrar **un proceso completo y coherente** desde Excel con errores hasta borrador de un estudiante. Habla con precisión: "en nuestra demostración", "usuarios ficticios" y "validación local". No afirmes tener integraciones institucionales todavía.
