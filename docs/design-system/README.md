# Sistema de diseño AIgis

Referencia de marca e interfaz del proyecto. La fuente de verdad es el artifact del equipo:
[AIgis Design System](https://claude.ai/artifact/PJB3GTbcrw9KYqXEPmnMAd#components). Este documento resume lo que necesita quien construya la web, el pitch o el README, y dice qué tan alineada está la web hoy.

Archivos en esta carpeta:

| Archivo | Qué es |
|---|---|
| `tokens.json` | Copia exacta de los tokens del artifact (color por tema, tipografía, espaciado, radios) |
| `logos/aigis-logo.svg` | Logo completo 1000×1000 sobre `brand-ink` |
| `logos/aigis-isotipo-oscuro.svg` | Solo el escudo, para fondos oscuros |
| `logos/aigis-isotipo-claro.svg` | Solo el escudo en `#0F6B6B` y `#C98A12`, para fondos claros |

Los SVG se reconstruyeron a partir de la geometría exacta que documenta el artifact, porque sus assets no se pudieron descargar. Los oficiales (incluido `aigis-logo.png` de 1000×1000 para la entrega) están en el grupo **Logos** del artifact. El wordmark es texto en Inter Bold con `cv08`: sin Inter instalada, la "I" pierde los remates y se lee "Algis"; conviértelo a contornos antes de exportarlo.

## Nombre y voz

- **AIgis**, de *aegis* (la égida, el escudo de Atenea), con "AI" al inicio. Siempre así: nunca "Aigis", "AIGIS" ni "Aegis".
- Tagline: **"Lo único que se puede robar es falso."** Para el pitch: "Un firewall para agentes que no tiene que adivinar: separa."
- Gemelo sigue siendo el nombre de la técnica (secure multi-execution con dos copias del agente). AIgis es el producto; en la demo el cuarto carril se llama **AIgis**.
- Español de Chile neutro, frases cortas, verbos activos. Honestos con los límites: garantía para confidencialidad, heurística para integridad. Términos técnicos sin traducir (honeytoken, prompt injection, sandbox, gateway, allowlist). Sin emojis.

## Logo

El isotipo es un escudo redondo de frente: disco sólido teal (el agente con las llaves verdaderas), aro y 8 remaches (la defensa que lo rodea sin tocarlo), hueco oscuro y núcleo ámbar (el honeytoken).

- Vive sobre `brand-ink` (`#0A1214`). En fondos claros, el isotipo claro y el nombre en `fg` con "AI" en `accent`.
- Tamaño mínimo del isotipo: 24 px. Bajo 48 px se pierden los remaches, y está bien.
- No recolorear, rotar, deformar, ni agregar sombras, degradados o marcos. El wordmark solo existe en Inter; el resto de la interfaz no usa Inter.

## Color

Oscuro primero. Usa los nombres de token, no hex sueltos.

| Token | Oscuro | Claro | Para qué |
|---|---|---|---|
| `bg` | `#0A1214` | `#F3F6F5` | Fondo de página |
| `surface` | `#121D20` | `#FFFFFF` | Tarjetas, carriles, terminales |
| `surface-raised` | `#10353A` | `#DCF0EE` | Lo destacado: el carril AIgis |
| `border` | `#24363A` | `#D3DDDB` | Bordes de 1 px |
| `fg` | `#E6F0EE` | `#0A1214` | Texto principal |
| `fg-muted` | `#A9BDBA` | `#3E4E51` | Texto secundario |
| `fg-subtle` | `#8FA6A3` | `#5A6B6E` | Etiquetas, metadatos |
| `accent` | `#3DDBC4` | `#0F6B6B` | Enlaces, foco, botón primario |
| `accent-on` | `#0A1214` | `#FFFFFF` | Texto sobre `accent` |
| `honeytoken` | `#F2B544` | `#9A5B00` | Llaves falsas y su alarma |
| `leak` / `leak-soft` | `#FF7B72` / `#3A1715` | `#BF3129` / `#FBE4E2` | Fuga real, error |
| `ok` / `ok-soft` | `#5FD19A` / `#14301F` | `#1D7A4F` / `#E1F3EA` | Contenido, tests verdes |
| `warn` / `warn-soft` | `#F59A4B` / `#35200F` | `#A84C06` / `#FDEBDD` | Resultado parcial |

Marca fija en ambos temas: `brand-ink #0A1214`, `brand-signal #3DDBC4`, `brand-canary #F2B544`, `brand-fog #E6F0EE`.

**Lenguaje de color:** teal = protegido; ámbar = honeytoken, y nada más (las advertencias genéricas usan `warn`, más naranjo); rojo = fuga real, nunca decorativo. Un solo acento por pantalla. Todo texto cumple 4.5:1 en ambos temas.

## Tipografía, espaciado y forma

| Familia | Token | Uso |
|---|---|---|
| Inter Bold + `cv08` | `brand` | Solo el wordmark |
| Space Grotesk | `display` | Títulos: display 56/60, h1 40/46, h2 28/34, h3 20/26 |
| IBM Plex Sans | `sans` | Texto: body-lg 18/28, body 16/26, small 14/22 |
| IBM Plex Mono | `mono` | Terminal y código 14/22; etiquetas en mayúsculas 13/18 con +1 px de tracking |

- Espaciado en pasos de 4: 4, 8, 12, 16, 24, 32, 48, 64.
- Radios: 6 (chips, pasos, inputs), 10 (botones, código), 14 (tarjetas, carriles), pill (estados).
- Bordes de 1 px en vez de sombras. Sin degradados, glow ni glassmorphism. El círculo es la forma de la marca: indicadores, avatares y loaders son discos o aros, nunca escudos heráldicos ni candados.

## Interfaz

- **Carriles:** cuatro tarjetas `surface`, radio 14, misma estructura (h3, pill de estado, terminal en mono). El carril AIgis usa `surface-raised` y borde `accent` de 2 px.
- **Pills de estado:** "Filtra" en `leak`, "A veces" y "Rompe la tarea" en `warn`, "No filtra" en `ok`, cada uno sobre su `-soft`. Siempre con texto.
- **Terminal:** fondo `bg`, texto `fg` en mono; el paso que dispara una alarma va sobre `leak-soft` (llave verdadera) o `honeytoken` al 14 % (llave falsa); `ok-soft` cuando la red bloquea.
- **Gemelos:** dos columnas iguales; el alto con disco sólido, el bajo con aro y punto ámbar, como el isotipo.
- **Tablas:** encabezados en `label` mono, cifras a la derecha con `tabular-nums`, denominadores visibles ("7/20").

La tarjeta **VistaAtaca** del artifact es la referencia visual de `/ataca` construida solo con estos tokens.

## Estado de la web (`apps/web`)

La web sigue este sistema desde la rama `feat/web-redesign`:

- `app/globals.css` usa los hex exactos de `tokens.json`. Los nombres de shadcn apuntan a los del sistema (`background` = `bg`, `card` = `surface`, `raised` = `surface-raised`, `muted-foreground` = `fg-muted`, `subtle` = `fg-subtle`, `primary` = `accent`). Los del dominio: `leak`, `honey` (= `honeytoken`), `safe` (= `ok`) y `warn`.
- Fuentes: IBM Plex Sans y Mono, Space Grotesk y, solo para el wordmark, Inter Bold servida desde `apps/web/app/fonts/` (inter-ui 4.1.1, OFL). Google Fonts le quita la variante `cv08` y sin ella "AIgis" se lee "Algis".
- Donde "AIgis" va en Space Grotesk (título del carril, tarjeta de la landing), se usa el componente del wordmark, porque esa I tampoco tiene remates.
- Logo, isotipo y favicon: `components/site/aigis-logo.tsx` y `app/icon.svg`. El isotipo toma los colores del tema: oscuro en tema oscuro, claro en tema claro.
- El ámbar queda solo para honeytokens; los resultados parciales usan `warn`.
- Gemelo queda como nombre de la técnica: "Gemelo bajo" y "Gemelo alto" en las cajas y el diagrama.

Diferencias que quedan: el gráfico de `/resultados` usa un azul propio (`chart-1`) que no está en el sistema, y los inputs usan radio 10 en vez de 6.
