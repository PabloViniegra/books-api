# Books API

<p align="center">
  <img src="https://cdn.simpleicons.org/nestjs/E0234E" width="42" alt="NestJS" />
  <img src="https://cdn.simpleicons.org/typescript/3178C6" width="42" alt="TypeScript" />
  <img src="https://cdn.simpleicons.org/mongodb/47A248" width="42" alt="MongoDB" />
  <img src="https://cdn.simpleicons.org/redis/DC382D" width="42" alt="Redis" />
  <img src="https://cdn.simpleicons.org/swagger/85EA2D" width="42" alt="Swagger" />
  <img src="https://cdn.simpleicons.org/docker/2496ED" width="42" alt="Docker" />
  <img src="https://cdn.simpleicons.org/google/4285F4" width="42" alt="Google OAuth" />
  <img src="https://cdn.simpleicons.org/jsonwebtokens/000000" width="42" alt="JWT" />
</p>

<p align="center">
  API REST para la gestion de libros construida con NestJS, MongoDB, Redis y Mongoose, con autenticacion mediante Google ID Token y JWT propio de la API.
</p>

## Indice

- [Vision general](#vision-general)
- [Tecnologias](#tecnologias)
- [Caracteristicas](#caracteristicas)
- [Arquitectura funcional](#arquitectura-funcional)
- [Requisitos](#requisitos)
- [Variables de entorno](#variables-de-entorno)
- [Puesta en marcha](#puesta-en-marcha)
- [Uso local](#uso-local)
- [Documentacion OpenAPI](#documentacion-openapi)
- [Autenticacion](#autenticacion)
- [Endpoints](#endpoints)
- [Modelo de datos](#modelo-de-datos)
- [Paginacion, busqueda y ordenacion](#paginacion-busqueda-y-ordenacion)
- [Cache de lectura](#cache-de-lectura)
- [Rate limiting](#rate-limiting)
- [Datos seed](#datos-seed)
- [Scripts disponibles](#scripts-disponibles)
- [Testing](#testing)
- [Documentacion relacionada](#documentacion-relacionada)
- [Licencia](#licencia)

## Vision general

`Books API` expone un CRUD de libros con estas caracteristicas principales:

- lectura publica de colecciones y detalle
- escrituras protegidas con `Bearer token`
- intercambio de `Google ID Token` por un `JWT` propio de la API
- validacion global de payloads y query params
- documentacion interactiva con Swagger / OpenAPI
- persistencia en MongoDB con `Mongoose`
- cache de lectura con `Redis` para `GET /books` y `GET /books/:id`
- limitacion global de peticiones con `@nestjs/throttler`
- seed automatico cuando la coleccion esta vacia

## Tecnologias

| Tecnologia | Uso en el proyecto |
| --- | --- |
| NestJS | framework principal de la API |
| TypeScript | lenguaje y tipado |
| MongoDB | persistencia de datos |
| Redis | cache de lectura para consultas de libros |
| Mongoose | ODM y esquema de `books` |
| Swagger / OpenAPI | documentacion interactiva y contrato HTTP |
| Google Identity | autenticacion de identidad en cliente |
| JWT | autorizacion para endpoints de escritura |
| Docker Compose | provision local de MongoDB y Redis |

## Caracteristicas

- `GET /books` con paginacion, busqueda y ordenacion
- `GET /books/:id` para detalle
- cache de 60 segundos por defecto para lecturas publicas de libros, con invalidacion en escrituras
- `POST /books`, `PATCH /books/:id` y `DELETE /books/:id` protegidos por JWT
- `POST /auth/google` para convertir un `idToken` de Google en un token utilizable por la API
- `GET /auth/google/test` como utilidad local de desarrollo fuera de produccion
- transformacion del modelo para exponer `id` en lugar de `_id`

## Arquitectura funcional

- `src/auth`: autenticacion con Google, firma JWT y guard de autorizacion
- `src/cache`: cliente Redis y primitivas de cache tolerantes a fallos
- `src/books`: controlador, servicio, DTOs, esquema Mongoose y seed inicial
- `src/setup-app.ts`: `ValidationPipe` global y configuracion Swagger
- `src/app.module.ts`: carga de configuracion, MongoDB, Redis, throttling y modulos de dominio

## Requisitos

- Node.js 20 o superior
- `pnpm`
- Docker y Docker Compose
- credenciales de Google OAuth para obtener `GOOGLE_CLIENT_ID`

## Variables de entorno

Parte de la configuracion ya esta documentada en `.env.example`.

| Variable | Requerida | Descripcion |
| --- | --- | --- |
| `PORT` | no | puerto HTTP de la API. Default: `3000` |
| `MONGODB_URI` | si | cadena de conexion de MongoDB |
| `REDIS_URL` | si | cadena de conexion de Redis usada para la cache de lectura |
| `CACHE_TTL_SECONDS` | no | TTL en segundos para `GET /books` y `GET /books/:id`. Default: `60` |
| `GOOGLE_CLIENT_ID` | si | client ID de Google OAuth usado para verificar el `idToken` |
| `JWT_SECRET` | si | secreto para firmar y verificar el token de la API |
| `JWT_EXPIRES_IN` | no | expiracion del JWT. Default: `1h` |
| `RATE_LIMIT_TTL` | no | ventana del rate limit en milisegundos. Default: `60000` |
| `RATE_LIMIT_LIMIT` | no | numero maximo de peticiones por ventana. Default: `100` |

Ejemplo:

```bash
cp .env.example .env
```

Puedes generar un secreto local para `JWT_SECRET` con:

```bash
openssl rand -base64 32
```

## Puesta en marcha

1. Instala dependencias.

```bash
pnpm install
```

2. Crea el archivo de entorno.

```bash
cp .env.example .env
```

3. Levanta MongoDB y Redis.

```bash
docker compose up -d
```

4. Inicia la API en desarrollo.

```bash
pnpm start:dev
```

## Uso local

- API HTTP: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs-json`
- MongoDB local: `mongodb://admin:admin@localhost:27017/books?authSource=admin`
- Redis local: `redis://localhost:6379`

## Documentacion OpenAPI

La API publica su contrato OpenAPI y una UI Swagger para explorar y probar endpoints.

- UI interactiva: `GET /docs`
- documento JSON: `GET /docs-json`

Si quieres probar endpoints protegidos desde Swagger:

1. Obtiene un `accessToken` con `POST /auth/google`.
2. Pulsa `Authorize` en Swagger.
3. Introduce `Bearer <accessToken>`.

## Autenticacion

La API no autentica usuario y password propios. El flujo actual es:

1. El frontend obtiene un `Google ID Token` mediante Google Sign-In.
2. El frontend envia ese token a `POST /auth/google`.
3. La API valida el token contra `GOOGLE_CLIENT_ID`.
4. Si el token es valido y el email esta verificado, la API devuelve un JWT propio.
5. Ese JWT se usa en `Authorization: Bearer <token>` para escrituras.

### Endpoint de intercambio

`POST /auth/google`

Request:

```json
{
  "idToken": "google-id-token"
}
```

Response:

```json
{
  "accessToken": "api-jwt",
  "tokenType": "Bearer",
  "expiresIn": "1h",
  "user": {
    "id": "109876543210987654321",
    "email": "reader@example.com",
    "name": "Reader Example",
    "picture": "https://lh3.googleusercontent.com/a/example"
  }
}
```

### Pagina de prueba de Google

En entornos no productivos esta disponible:

- `GET /auth/google/test`

Esta ruta devuelve una pagina HTML que ayuda a:

- iniciar sesion con Google
- capturar el `idToken`
- intercambiarlo por el `accessToken` de la API

La ruta deja de existir en `production`.

## Endpoints

| Metodo | Ruta | Protegido | Descripcion |
| --- | --- | --- | --- |
| `POST` | `/auth/google` | no | intercambia un `Google ID Token` por un JWT de API |
| `GET` | `/auth/google/test` | no | utilidad HTML para desarrollo local |
| `GET` | `/books` | no | lista libros con paginacion, busqueda y ordenacion |
| `GET` | `/books/:id` | no | obtiene un libro por `id` |
| `POST` | `/books` | si | crea un libro |
| `PATCH` | `/books/:id` | si | actualiza un libro |
| `DELETE` | `/books/:id` | si | elimina un libro |

### Codigos HTTP mas relevantes

- `200` para lecturas, autenticacion y actualizaciones correctas
- `201` para altas de libros
- `204` para borrados correctos
- `400` para payloads, ids o query params invalidos
- `401` para token ausente o invalido
- `404` para recursos no encontrados
- `409` para ISBN duplicado
- `429` cuando se supera el limite global de peticiones

## Modelo de datos

La entidad `Book` expuesta por la API tiene esta forma:

```json
{
  "id": "507f1f77bcf86cd799439011",
  "title": "Cien anos de soledad",
  "author": "Gabriel Garcia Marquez",
  "year": 1967,
  "genre": "Realismo magico",
  "isbn": "9780307474728",
  "price": 19.99,
  "url": "https://example.com/books/cien-anos-de-soledad",
  "createdAt": "2026-04-29T12:00:00.000Z",
  "updatedAt": "2026-04-29T12:00:00.000Z"
}
```

### Payload de creacion

```json
{
  "title": "Release It!",
  "author": "Michael T. Nygard",
  "year": 2007,
  "genre": "Software",
  "isbn": "9780978739218",
  "price": 33.5,
  "url": "https://example.com/books/release-it"
}
```

## Paginacion, busqueda y ordenacion

`GET /books` acepta estos query params:

| Parametro | Tipo | Default | Descripcion |
| --- | --- | --- | --- |
| `page` | `number` | `1` | pagina solicitada |
| `limit` | `number` | `10` | tamano de pagina. Maximo: `50` |
| `search` | `string` | - | busqueda parcial case-insensitive en `title`, `author`, `genre` e `isbn` |
| `sortBy` | `string` | `createdAt` | `title`, `author`, `year`, `genre`, `price`, `createdAt` |
| `sortOrder` | `string` | `desc` | `asc` o `desc` |

Ejemplo:

```http
GET /books?page=1&limit=5&search=martin&sortBy=title&sortOrder=asc
```

Respuesta paginada:

```json
{
  "items": [],
  "total": 28,
  "page": 1,
  "limit": 5,
  "totalPages": 6,
  "hasNextPage": true,
  "hasPreviousPage": false
}
```

## Cache de lectura

La API usa Redis para acelerar lecturas publicas del modulo `books`.

- `GET /books` se cachea por combinacion de `page`, `limit`, `search`, `sortBy` y `sortOrder`
- `GET /books/:id` se cachea por `id`
- TTL por defecto: `60` segundos
- `POST /books`, `PATCH /books/:id` y `DELETE /books/:id` invalidan la cache relacionada
- si Redis no esta disponible, la API sigue respondiendo desde MongoDB

## Rate limiting

La API aplica rate limiting global con `@nestjs/throttler`.

- ventana por defecto: `60000 ms`
- maximo por defecto: `100` peticiones por ventana
- configurable mediante `RATE_LIMIT_TTL` y `RATE_LIMIT_LIMIT`

## Datos seed

Cuando la coleccion `books` esta vacia al arrancar la aplicacion, se insertan automaticamente libros de prueba para facilitar el uso local y el testing manual.

## Scripts disponibles

| Script | Descripcion |
| --- | --- |
| `pnpm start` | inicia la API |
| `pnpm start:dev` | inicia la API en modo watch |
| `pnpm start:debug` | inicia la API en modo debug |
| `pnpm start:prod` | ejecuta la build compilada |
| `pnpm build` | compila el proyecto |
| `pnpm lint` | ejecuta ESLint |
| `pnpm test` | ejecuta tests unitarios |
| `pnpm test:e2e` | ejecuta tests end-to-end |
| `pnpm test:cov` | genera cobertura |

## Testing

Para validar la API localmente:

```bash
pnpm test
pnpm test:e2e
```

## Documentacion relacionada

- [CONSUMPTION.md](./CONSUMPTION.md): guia para equipos frontend
- [CONTRIBUTING.md](./CONTRIBUTING.md): flujo de contribucion
- [LICENSE](./LICENSE): licencia MIT

## Licencia

Este proyecto se distribuye bajo licencia MIT. Consulta el archivo [LICENSE](./LICENSE).
