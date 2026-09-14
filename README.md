# FlowForge — Frontend

Interfaz de [FlowForge](https://github.com/MathiasMartinez02/flowforge-backend): dashboard de
workflows, formulario de creación (trigger + pasos), detalle con historial de ejecuciones y timeline
en vivo de cada run.

Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind v4. Sin librerías de formularios ni
fetching (`react-hook-form`/`zod`/TanStack Query no estaban en el alcance del MVP) — `useState` +
`fetch` alcanzan para el tamaño real de las pantallas.

## Pantallas

| Ruta | Qué muestra |
|---|---|
| `/` | dashboard: lista de workflows, stats reales (total/activos calculados del propio listado), botón "Ejecutar ahora" por fila |
| `/workflows/new` | formulario de creación: nombre, trigger (manual/programado + cron), pasos (`http_request` / `notification` / `condition`) |
| `/workflows/[id]` | detalle: cadena de pasos, activar/pausar, historial de runs |
| `/runs/[id]` | timeline de una ejecución puntual, con reintentos visibles (`RunTimeline.tsx`) |

## Cómo levantarlo

### Con Docker Compose (recomendado)

Desde la carpeta contenedora del proyecto (`flowforge/`, un nivel arriba de este repo, junto al
backend):

```bash
docker compose up --build
```

Frontend en `http://localhost:3001`, apuntando al backend real en `http://localhost:3000`.

### Local (sin Docker)

```bash
cp .env.example .env   # NEXT_PUBLIC_API_URL, por default http://localhost:3000
npm ci
npm run dev
```

Requiere el backend corriendo (ver [`flowforge-backend`](https://github.com/MathiasMartinez02/flowforge-backend)) — sin datos mockeados, todas las pantallas pegan contra la API real.

## Ejecución de workflows

`POST /workflows/:id/runs` encola el primer paso y devuelve al toque (no ejecuta de forma síncrona,
ver el backend) — el detalle de un run (`/runs/[id]`) hace polling a `GET /runs/:id` cada 1.5s hasta
llegar a un estado final, mostrando el timeline real por paso a medida que el worker los procesa
(incluyendo los reintentos con backoff cuando una `action` falla).

## Testing

```bash
npm run lint
npm run build
```

CI (`.github/workflows/ci.yml`) corre lint + build en cada push/PR. Sin tests de componentes en esta
fase — el frontend es una capa delgada sobre la API real del backend, que es donde vive la lógica
(motor de ejecución, colas, condiciones) cubierta por tests unitarios y e2e reales.

## Diseño

Dirección "Sentry Inspired" (tema oscuro fijo, sin modo claro): tokens en `app/globals.css` vía
`@theme inline` de Tailwind v4. Tipografías reales por `next/font/google` — Space Grotesk
(display), Rubik (body), Space Mono (cron/timestamps/config HTTP).
