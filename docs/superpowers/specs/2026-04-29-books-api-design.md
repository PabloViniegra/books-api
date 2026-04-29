# Books API Design

## Goal

Construir una API REST de libros con NestJS que exponga un CRUD completo y persista datos en MongoDB, ejecutando la base de datos en Docker.

## Scope

- API publica sin autenticacion en esta primera version.
- CRUD completo de libros con borrado real.
- Persistencia en MongoDB mediante Mongoose.
- MongoDB ejecutandose en Docker Compose.
- Validacion de entrada en toda la API.
- Documentacion OpenAPI con Swagger UI.
- Seed automatico de libros base cuando la coleccion esta vacia.
- Documentacion basica de arranque y uso.

## Out of Scope

- Autenticacion y autorizacion.
- Borrado logico.
- Paginacion, filtros o busqueda.
- Containerizar tambien la API en esta primera version.

## Architecture

La aplicacion mantendra `AppModule` como punto de entrada y agregara un modulo de feature `BooksModule`.

La estructura propuesta es:

- `src/app.module.ts`: registra configuracion global y conexion a MongoDB.
- `src/books/books.module.ts`: encapsula el feature de libros.
- `src/books/books.controller.ts`: define endpoints REST bajo `/books`.
- `src/books/books.service.ts`: contiene la logica de negocio y acceso a datos.
- `src/books/schemas/book.schema.ts`: define el esquema Mongoose.
- `src/books/dto/create-book.dto.ts`: define el contrato de creacion y validaciones.
- `src/books/dto/update-book.dto.ts`: define actualizacion parcial con `PartialType`.

La aplicacion usara `ValidationPipe` global para rechazar payloads invalidos de forma consistente.

## API Design

La API seguira un diseno REST orientado a recursos con el recurso `books`.

Endpoints:

- `POST /books`: crea un libro.
- `GET /books`: lista todos los libros.
- `GET /books/:id`: obtiene un libro por id.
- `PATCH /books/:id`: actualiza parcialmente un libro.
- `DELETE /books/:id`: elimina un libro de forma definitiva.

Documentacion interactiva:

- `GET /docs`: Swagger UI para probar la API.
- `GET /docs-json`: documento OpenAPI en JSON.

Codigos de estado esperados:

- `201 Created` en creacion exitosa.
- `200 OK` en lecturas y actualizacion exitosa.
- `204 No Content` en borrado exitoso.
- `400 Bad Request` para ids invalidos o payloads no validos.
- `404 Not Found` cuando el libro no existe.
- `409 Conflict` cuando el `isbn` ya existe.

## Data Model

Coleccion: `books`

Campos del documento `Book`:

- `title`: `string`, requerido, trim, no vacio.
- `author`: `string`, requerido, trim, no vacio.
- `year`: `number`, requerido, entero positivo.
- `genre`: `string`, requerido, trim, no vacio.
- `isbn`: `string`, requerido, trim, unico.
- `price`: `number`, requerido, mayor o igual a `0`.
- `url`: `string`, requerida, URL valida.
- `createdAt`: `Date`, generado por MongoDB/Mongoose.
- `updatedAt`: `Date`, generado por MongoDB/Mongoose.

El modelo expuesto por la API incluira tambien `id` como string serializado.

El esquema habilitara `timestamps: true`.

Ejemplo de payload:

```json
{
  "title": "Cien años de soledad",
  "author": "Gabriel Garcia Marquez",
  "year": 1967,
  "genre": "Realismo magico",
  "isbn": "9780307474728",
  "price": 19.99,
  "url": "https://example.com/books/cien-anos-de-soledad"
}
```

## Validation Rules

- `title`, `author`, `genre` e `isbn` deben ser strings no vacios.
- `year` debe ser numero entero y mayor que `0`.
- `price` debe ser numero y no negativo.
- `url` debe cumplir formato URL.
- `PATCH` permitira cambios parciales reutilizando las mismas validaciones para los campos enviados.
- Antes de crear o actualizar, el servicio debe proteger la unicidad de `isbn` y traducir errores de duplicado a `409 Conflict`.

## Error Handling

- Si `:id` no es un ObjectId valido, responder `400 Bad Request`.
- Si no existe un libro para el `id`, responder `404 Not Found`.
- Si se intenta guardar un `isbn` repetido, responder `409 Conflict`.
- Si el payload no pasa validacion, responder `400 Bad Request` con detalle de campos.

## Configuration

Variables esperadas:

- `PORT=3000`
- `MONGODB_URI=mongodb://admin:admin@localhost:27017/books?authSource=admin`

Se agregara un archivo `.env.example` para documentar la configuracion minima.

## Swagger

La aplicacion configurara `@nestjs/swagger` durante el arranque para generar el documento OpenAPI y publicar Swagger UI.

Se documentaran:

- payloads de `POST /books` y `PATCH /books/:id`.
- respuestas exitosas del CRUD.
- errores `400`, `404` y `409`.
- ejemplos basicos en el DTO para facilitar pruebas desde la UI.

## Seed Data

Durante el arranque de la aplicacion, un proveedor del modulo de libros comprobara si la coleccion `books` esta vacia.

- Si esta vacia, insertara un set pequeno de libros base.
- Si ya contiene datos, no insertara nada.

Esto permite abrir Swagger y probar la API inmediatamente en una base nueva sin tener que crear registros manualmente.

## Docker Setup

Se agregara `docker-compose.yml` para levantar MongoDB con:

- imagen oficial `mongo`.
- puerto `27017:27017`.
- volumen persistente para los datos.
- variables `MONGO_INITDB_ROOT_USERNAME` y `MONGO_INITDB_ROOT_PASSWORD`.

La base quedara accesible desde la API local usando la URI definida en `.env`.

## Testing Strategy

Pruebas unitarias:

- creacion exitosa de libro.
- manejo de `isbn` duplicado.
- busqueda y actualizacion de libros inexistentes.
- borrado de libros inexistentes.

Pruebas e2e minimas:

- `POST /books` crea un libro.
- `GET /books` devuelve la lista.
- `GET /books/:id` devuelve el libro creado.
- `PATCH /books/:id` actualiza campos.
- `DELETE /books/:id` elimina el libro.

## Documentation Updates

`README.md` se actualizara para incluir:

- instalacion de dependencias.
- arranque de MongoDB con Docker Compose.
- variables de entorno requeridas.
- arranque de NestJS en desarrollo.
- acceso a Swagger UI y al documento OpenAPI.
- comportamiento del seed automatico.
- resumen de endpoints disponibles.

## Implementation Notes

- Se eliminara el endpoint de ejemplo `GET /` que hoy devuelve `Hello World!`.
- El feature debe seguir patrones estandar de NestJS: modulo, controlador, servicio, DTOs y schema separados por responsabilidad.
- La solucion debe ser minimalista y suficiente para esta primera entrega.
