# Guion SYNCRO 2.0 — Exposición de 10 minutos

## Reparto sugerido para 4 integrantes

| Tiempo | Expositor | Tema | Evidencia en pantalla |
|---|---|---|---|
| 0:00–1:05 | A | Problema y necesidad | Diapositivas 1–2 |
| 1:05–2:05 | B | Propuesta de valor y usuarios | Diapositivas 3–4 |
| 2:05–2:50 | C | Arquitectura y viabilidad | Diapositiva 5 |
| 2:50–4:40 | C | Demostración administrativa | Abrir SYNCRO: Excel con errores → Excel ampliado → validar → propuesta → publicar |
| 4:40–6:55 | D | Demostración estudiantil | Horarios publicados → planificador → cruces → borrador → alternativas |
| 6:55–7:50 | B | Estadísticas y diseño UX | Estadísticas piloto + capturas |
| 7:50–8:50 | A | Alcance y límites reales | Diapositiva 9 |
| 8:50–10:00 | Todos | Beneficio y Q&A breve | Diapositiva 10 |

Estas asignaciones son propuestas, no roles reales del equipo; ajustarlas conforme a quienes presenten.

## Mensaje de apertura

> “Durante cada periodo académico, alumnos y docentes pueden encontrarse con distintas versiones de horarios, conflictos de materias y dificultades para planificar su semestre. SYNCRO nace para ordenar ese proceso: una plataforma que valida, publica y permite construir horarios antes de la inscripción.”

## Demostración administrativa (1 min 50 s)

1. Cambia el selector **Perfil → Jefatura de carrera**.
2. Abre **Administración**, descarga el Excel **con errores**, adjúntalo y pulsa **Validar archivo**. Señala los errores encontrados y el bloqueo de importación.
3. Adjunta **Excel ampliado · grupos alternativos**, valida y pulsa **Crear propuesta**.
4. Cambia a **Control Escolar** y pulsa **Aprobar y publicar**. Señala el aumento en el identificador de versión.

**Frase útil:** “El sistema evita que se publique un archivo con errores detectables y conserva las publicaciones anteriores para consulta.”

## Demostración estudiantil (2 min 15 s)

1. Entra en **Horarios publicados** y muestra tabla, filtros y versión.
2. Cambia a **Estudiante → Mi planificador**.
3. Elige Ingeniería de Software (DEMO). Agrega **Bases de Datos 5A**: se muestra lunes y miércoles.
4. Intenta **Redes de Computadoras 5B**: se bloquea por cruce lunes de 09:00 a 10:00.
5. Agrega **Desarrollo Web 5A**: aparece aviso de 10 minutos de traslado entre campus.
6. Escribe **Plan A**, guarda borrador. Marca Bases de Datos y Redes en el generador y pulsa **Generar opciones**. Aplica una y guárdala como **Plan B**.
7. Muestra brevemente **Estadísticas del piloto**.

**Frase útil:** “SYNCRO no inscribe al estudiante, pero reduce la incertidumbre previa al organizar grupos compatibles y mostrar advertencias.”

## Preguntas previsibles

**¿Es un sistema oficial?** No. Es un prototipo local con datos ficticios. Una operación real requiere autorización e integración con Control Escolar.

**¿Funciona el calendario?** Sí. Renderiza bloques horarios, calcula carga semanal y previene materias superpuestas.

**¿Cómo valida Excel?** Exige columnas conocidas, formatos válidos y comprueba conflictos de intervalos por docente, aula y grupo.

**¿La aplicación utiliza IA?** No. El generador recorre combinaciones disponibles y descarta las que incumplen las restricciones.

**¿Cómo protegen los datos?** Esta versión no debe manejar datos reales. Un producto institucional debe incorporar identidad oficial, permisos en servidor, cifrado, auditoría y medidas de privacidad.

**¿Tiene cupos en tiempo real?** No. Muestra capacidades ficticias y métricas experimentales de borradores, sin conexión a inscripciones.

**¿Qué construirían después?** Validar con la institución, integrar datos oficiales, seguridad real, pruebas de carga y pilotaje de usuarios.

## Comprobaciones antes de exponer

- Inicia el servidor con `INICIAR_SYNCRO.bat` al menos una vez antes de la presentación.
- Para comenzar limpio, presiona **Restablecer datos de demo**.
- Abre la app en Chrome y comprueba que aparecen los 12 bloques iniciales.
- Ten disponibles en `ejemplos` ambos Excel: errores y ampliado.
- No cambies a una versión real ni escribas datos personales de algún alumno.
- Ten abiertas las diapositivas y el navegador y acordadas las transiciones de expositores.

## Mensaje de cierre

> “SYNCRO demuestra que es posible integrar la gestión y la planeación académica en una misma fuente de horarios. Nuestro prototipo ya valida propuestas, publica versiones y ayuda a organizar materias. La siguiente etapa es validar su operación y seguridad con la universidad para convertirlo en una solución institucional.”
