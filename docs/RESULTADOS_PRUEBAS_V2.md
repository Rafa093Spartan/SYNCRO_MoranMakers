# Evidencia de pruebas · SYNCRO 2.0

Fecha de ejecución: 20/11/2026 (entorno del prototipo).

Comando:

```bash
python -m unittest discover -s tests -v
```

**Resultado: 14 pruebas automatizadas exitosas.** Incluyen 5 pruebas de regresión de v1 y 9 adicionales de v2.

## Cobertura comprobada

1. Arranque con versión de demostración y datos de consulta.
2. Rechazo de Excel con errores y bloqueo de importación.
3. Creación/publicación e historial de versiones; rechazo de publicación duplicada.
4. Bloqueo de conflictos estudiantiles, aviso de traslado y guardado de borradores.
5. Validación de horarios consecutivos sin falso positivo.
6. Validez del Excel ampliado con grupos alternativos.
7. Selección obligatoria de todas las sesiones de una asignatura de varios días.
8. Generación de alternativas compatibles verificadas por el motor de cruces.
9. Separación de perfiles de demo, guardado y borrado de planes.
10. Detección de borradores desactualizados tras publicar una nueva versión.
11. Cancelación de propuestas y rechazo de su publicación.
12. Consulta de versiones históricas y errores de versión inexistente.
13. Rechazo de filas duplicadas en Excel.
14. Rechazo de selecciones inválidas, perfiles no admitidos y parámetros incorrectos.

## Prueba navegada con un navegador automatizado

Se ejecutó: abrir app → elegir Jefatura → cargar Excel ampliado → validar → crear propuesta → elegir Control Escolar → publicar → abrir planificador → añadir Bases de Datos (2 sesiones) y Desarrollo Web → comprobar aviso de traslado → solicitar combinaciones de Bases de Datos y Redes de Computadoras. Se obtuvieron tres alternativas y no hubo errores de JavaScript observados en ese recorrido.

Las capturas están dentro de `docs/capturas/`. Este resultado no sustituye un estudio completo de seguridad, usabilidad, accesibilidad, rendimiento o compatibilidad entre navegadores.
