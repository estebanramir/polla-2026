# ⚽ La Polla del Mundial 2026

App para jugar la polla del Mundial 2026 entre amigos: cada quien pronostica los
resultados antes de que arranque cada partido, y se acumulan puntos en un ranking.

## Reglas

| Acierto | Puntos |
| --- | --- |
| Marcador exacto | **5 pts** |
| Ganador o empate (sin marcador exacto) | **2 pts** |
| Goleador del torneo | **10 pts** |
| Mejor arquero | **10 pts** |

- Los pronósticos se pueden cambiar **hasta que arranca el partido**; después se bloquean.
- Viene precargado con los **72 partidos reales** de la fase de grupos (12 grupos, 48 selecciones con banderas).
- **Los resultados se actualizan solos** desde el scoreboard público de ESPN: al cargar el home (máximo una consulta cada 10 min), con un cron diario en Vercel y con el botón "Sincronizar resultados" del admin. El admin puede corregir cualquier resultado a mano.
- El home muestra la **tabla de posiciones de cada grupo** (verde = clasifica directo, dorado = posible mejor tercero) y el **podio del ranking**.
- Los cruces de eliminatorias (16avos → final) **se generan automáticamente** según las posiciones de los grupos y los 8 mejores terceros, y se van llenando con cada ganador.

## Stack

Next.js (App Router) · Prisma · PostgreSQL · Tailwind CSS. Sin dependencias de auth: login simple con usuario/contraseña y cookie firmada.

## Desarrollo local

Requiere Node 22+ (hay `.nvmrc`) y Docker para el Postgres local.

```bash
nvm use
npm install
docker run -d --name polla-postgres -e POSTGRES_PASSWORD=polla -e POSTGRES_DB=polla -p 5544:5432 postgres:16-alpine
npx prisma db push      # crea las tablas
npx tsx prisma/seed.ts  # equipos, partidos y usuario admin
npm run dev
```

Usuario admin inicial: **admin / admin123** (cámbiale la contraseña o crea otro admin en la BD).

Scripts útiles:

```bash
npx tsx scripts/verify.ts  # verifica puntaje y generación de eliminatorias (restaura la BD al final)
npx tsx scripts/e2e.ts     # prueba E2E en Chrome headless (requiere npm run dev corriendo)
```

## Deploy en Vercel

1. **Base de datos**: crea un Postgres en [Neon](https://neon.tech) o [Supabase](https://supabase.com) (gratis) y copia el connection string. En Vercel también puedes usar el marketplace: *Storage → Create Database → Neon*.
2. **Sube el repo a GitHub** e impórtalo en [vercel.com/new](https://vercel.com/new).
3. **Variables de entorno** en el proyecto de Vercel:
   - `DATABASE_URL` → el connection string del paso 1
   - `SESSION_SECRET` → cualquier string aleatorio largo
4. **Crea las tablas y el seed** (una sola vez, desde tu máquina apuntando a la BD de producción):
   ```bash
   DATABASE_URL="postgres://...produccion..." npx prisma db push
   DATABASE_URL="postgres://...produccion..." npx tsx prisma/seed.ts
   ```
5. Deploy. El `postinstall` ya corre `prisma generate` en el build de Vercel.

## Administración

En **/admin** (solo usuarios con `isAdmin`):

- Cargar el resultado de cada partido (vacío = borrar). Al guardar se recalculan puntos y cruces.
- En eliminatorias, si hay empate se elige el ganador por penales.
- Ajustar la fecha/hora de un partido (en UTC) si FIFA la cambia.
- Definir el goleador y mejor arquero oficiales, y cerrar las apuestas de premios.
- "Recalcular cruces" regenera 16avos y propaga ganadores manualmente si hace falta.
