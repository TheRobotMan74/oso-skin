# Oso Skin

Rutina diaria para puntos negros y marcas de acné, instalable en el cel o en la compu (PWA).

**App:** https://therobotman74.github.io/oso-skin/

## Qué hace

- Te dice qué toca hoy en la mañana y en la noche (salicílico, Differin o descanso), con un plan de 12 semanas que sube poco a poco.
- Palomeas cada paso, apuntas cómo sientes la piel y ves tu avance en un calendario.
- Si la piel se irrita, pausas una noche y el plan se recorre.
- Ficha de cada producto: cuánto usar, cómo, y hasta cuándo te alcanza.
- Abre aunque no tengas internet.

## Dónde se guarda tu avance

En el navegador del aparato (localStorage), no en este repo ni en ningún servidor. Para pasarlo a otro aparato o no perderlo: **Ajustes → Exportar respaldo**, y en el otro aparato **Importar respaldo**.

## Instalar

- **Android (Chrome):** abre el link y toca **Instalar**.
- **iPhone (Safari):** Compartir → **Agregar a inicio**.
- **Compu (Chrome o Edge):** botón de instalar en la barra de direcciones, o **Instalar** dentro de la app.

## Archivos

- `index.html`: la app (pantalla, estilos y guardado).
- `logic.js`: el plan, sin nada de pantalla: qué toca cada día, pausas, cuánto dura cada envase, respaldos.
- `sw.js`: guarda la app para que abra sin internet. Solo borra sus propias cachés (`oso-skin-*`), porque las otras apps de `therobotman74.github.io` comparten el mismo almacén.
- `test/logic.test.js`: pruebas de `logic.js`. Córrelas con `node --test`.
- `fonts/`: Archivo e IBM Plex (licencia SIL OFL 1.1, ver `fonts/LICENSE-OFL.txt`).

Orientación general, no consulta médica.
