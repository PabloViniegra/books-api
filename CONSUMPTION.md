# API Consumption Guide

## Objetivo

Este documento explica como debe integrarse un frontend con `books-api`, incluyendo autenticacion, consumo de endpoints, manejo de errores y consideraciones practicas para navegador.

## Indice

- [Base URL y recursos utiles](#base-url-y-recursos-utiles)
- [Consideracion importante sobre CORS](#consideracion-importante-sobre-cors)
- [Modelo de autenticacion](#modelo-de-autenticacion)
- [Flujo recomendado para frontend](#flujo-recomendado-para-frontend)
- [Endpoints publicos](#endpoints-publicos)
- [Endpoints protegidos](#endpoints-protegidos)
- [Paginacion, busqueda y ordenacion](#paginacion-busqueda-y-ordenacion)
- [Formato de respuestas](#formato-de-respuestas)
- [Manejo de errores](#manejo-de-errores)
- [Ejemplos de consumo](#ejemplos-de-consumo)
- [Buenas practicas para frontend](#buenas-practicas-para-frontend)

## Base URL y recursos utiles

En local:

- base URL API: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs-json`

## Consideracion importante sobre CORS

La configuracion actual de la API no habilita CORS explicitamente.

Eso significa que un frontend ejecutado en otro origen, por ejemplo `http://localhost:5173` o `http://localhost:3001`, no podra consumir la API directamente desde navegador salvo que ocurra una de estas condiciones:

- el frontend se sirva desde el mismo origen que la API
- se use un proxy o BFF server-side
- se anada soporte CORS en la API

Si el equipo frontend va a consumir esta API desde un origen distinto, este punto debe resolverse antes de la integracion en navegador.

## Modelo de autenticacion

La API usa un esquema en dos pasos:

1. Google autentica al usuario en el frontend y devuelve un `idToken`.
2. El frontend envia ese `idToken` a `POST /auth/google`.
3. La API devuelve un `accessToken` JWT propio.
4. Ese JWT se usa como `Bearer token` para crear, actualizar y borrar libros.

La API no usa cookies ni sesiones de servidor para este flujo.

## Flujo recomendado para frontend

1. Implementar Google Sign-In en el cliente.
2. Capturar el `idToken` devuelto por Google.
3. Llamar a `POST /auth/google`.
4. Guardar el `accessToken` de forma segura para la sesion actual.
5. Adjuntar `Authorization: Bearer <accessToken>` en escrituras.
6. Si el token expira o la API devuelve `401`, repetir el intercambio mediante un nuevo login de Google.

## Endpoints publicos

### `POST /auth/google`

Intercambia el token de Google por el token propio de la API.

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

### `GET /books`

Devuelve una lista paginada.

### `GET /books/:id`

Devuelve el detalle de un libro.

## Endpoints protegidos

Los siguientes endpoints requieren cabecera `Authorization`:

- `POST /books`
- `PATCH /books/:id`
- `DELETE /books/:id`

Ejemplo de cabecera:

```http
Authorization: Bearer <accessToken>
```

## Paginacion, busqueda y ordenacion

`GET /books` soporta:

| Parametro | Tipo | Default | Notas |
| --- | --- | --- | --- |
| `page` | `number` | `1` | minimo `1` |
| `limit` | `number` | `10` | maximo `50` |
| `search` | `string` | - | busca en `title`, `author`, `genre`, `isbn` |
| `sortBy` | `string` | `createdAt` | `title`, `author`, `year`, `genre`, `price`, `createdAt` |
| `sortOrder` | `string` | `desc` | `asc` o `desc` |

Ejemplo:

```http
GET /books?page=1&limit=12&search=martin&sortBy=title&sortOrder=asc
```

## Formato de respuestas

### Libro

```json
{
  "id": "507f1f77bcf86cd799439011",
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "year": 2008,
  "genre": "Software",
  "isbn": "9780132350884",
  "price": 34.9,
  "url": "https://example.com/books/clean-code",
  "createdAt": "2026-04-29T12:00:00.000Z",
  "updatedAt": "2026-04-29T12:00:00.000Z"
}
```

### Respuesta paginada

```json
{
  "items": [],
  "total": 28,
  "page": 1,
  "limit": 10,
  "totalPages": 3,
  "hasNextPage": true,
  "hasPreviousPage": false
}
```

## Manejo de errores

Estados que el frontend debe contemplar:

| Codigo | Significado | Recomendacion frontend |
| --- | --- | --- |
| `400` | request invalida | mostrar validacion o revisar parametros enviados |
| `401` | token ausente, invalido o Google token incorrecto | forzar reautenticacion |
| `404` | libro no encontrado | mostrar estado vacio o redirigir |
| `409` | ISBN duplicado | informar conflicto al usuario |
| `429` | rate limit excedido | reintentar mas tarde y mostrar mensaje explicativo |
| `500` | error inesperado | mostrar error generico y registrar diagnostico |

En errores de validacion de NestJS, el campo `message` puede llegar como string o como array de strings. El frontend debe soportar ambos formatos.

## Ejemplos de consumo

### Login con intercambio de token

```ts
export async function exchangeGoogleToken(idToken: string) {
  const response = await fetch('http://localhost:3000/auth/google', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ idToken }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      Array.isArray(payload.message)
        ? payload.message.join(', ')
        : payload.message ?? 'Authentication failed',
    );
  }

  return payload as {
    accessToken: string;
    tokenType: 'Bearer';
    expiresIn: string;
    user: {
      id: string;
      email: string;
      name?: string;
      picture?: string;
    };
  };
}
```

### Listado de libros con filtros

```ts
type BooksQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'title' | 'author' | 'year' | 'genre' | 'price' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
};

export async function getBooks(query: BooksQuery = {}) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });

  const response = await fetch(`http://localhost:3000/books?${params.toString()}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message ?? 'Could not fetch books');
  }

  return payload;
}
```

### Crear un libro

```ts
type CreateBookInput = {
  title: string;
  author: string;
  year: number;
  genre: string;
  isbn: string;
  price: number;
  url: string;
};

export async function createBook(input: CreateBookInput, accessToken: string) {
  const response = await fetch('http://localhost:3000/books', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      Array.isArray(payload.message)
        ? payload.message.join(', ')
        : payload.message ?? 'Could not create book',
    );
  }

  return payload;
}
```

## Buenas practicas para frontend

- centraliza `baseURL` y cabeceras comunes en un cliente HTTP unico
- trata `401` como sesion invalida o expirada
- no asumas que `message` siempre es string
- utiliza el metadata de paginacion para construir la UI
- evita guardar el token en `localStorage` si puedes resolver la sesion en memoria o a traves de un BFF
- si el frontend vive en otro origen, planifica CORS o un proxy antes de desarrollar sobre navegador
