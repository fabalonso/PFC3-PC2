# ReCircula Lima

Práctica Calificada 2 de Proyecto Final de Carrera III. Directorio de puntos de acopio y coordinación de recojos de reciclables mediante una aplicación Express con PostgreSQL.

## Desarrollo local

Se requiere Node.js 24 y una base PostgreSQL. Copia .env.example a .env y configura DATABASE_URL.

1. npm ci
2. npm run db:migrate
3. npm run build
4. npm start

El directorio contiene lugares y horarios ficticios para demostrar el flujo académico.

## Pruebas

Ejecuta npm test para usar un PostgreSQL local en memoria mediante PGlite. Define TEST_DATABASE_URL para aplicar las migraciones y ejecutar los mismos flujos contra PostgreSQL real en un esquema de prueba aislado. GitHub Actions ejecuta build y pruebas con PostgreSQL 17.

## Ramas y despliegue

Trabaja en test y abre un pull request hacia main. Cada commit de la práctica identifica su historia PC2PF3. Los pushes a test y los pull requests ejecutan build, pruebas, Semgrep y Gitleaks. Solo main puede desplegar si todas las verificaciones pasan.

El proyecto Vercel se conecta a Neon mediante DATABASE_URL. GitHub Actions usa VERCEL_TOKEN, VERCEL_ORG_ID y VERCEL_PROJECT_ID como secretos. El token requiere acceso al proyecto de producción. El workflow aplica las migraciones con DATABASE_URL_UNPOOLED cuando está disponible, construye el artefacto de Vercel y publica el commit validado.

Producción: https://recircula-lima-pc2.vercel.app
