# Contributing

## Objetivo

Este documento define el flujo recomendado para contribuir a `books-api` con cambios de codigo, tests o documentacion.

## Indice

- [Requisitos](#requisitos)
- [Preparar el entorno](#preparar-el-entorno)
- [Flujo de trabajo](#flujo-de-trabajo)
- [Convenciones del proyecto](#convenciones-del-proyecto)
- [Validacion antes de abrir cambios](#validacion-antes-de-abrir-cambios)
- [Cambios en la API](#cambios-en-la-api)
- [Pull requests](#pull-requests)

## Requisitos

- Node.js 20 o superior
- `pnpm`
- Docker y Docker Compose
- acceso a credenciales de Google si vas a probar el flujo real de autenticacion

## Preparar el entorno

1. Instala dependencias.

```bash
pnpm install
```

2. Crea tu configuracion local.

```bash
cp .env.example .env
```

3. Levanta MongoDB.

```bash
docker compose up -d
```

4. Inicia la API en desarrollo.

```bash
pnpm start:dev
```

## Flujo de trabajo

1. Crea una rama a partir de la rama principal.
2. Haz cambios pequenos y cohesionados.
3. Manten actualizada la documentacion cuando cambie el comportamiento publico.
4. Ejecuta validaciones locales antes de abrir el PR.

Sugerencia de nombres de rama:

- `feat/books-search-improvements`
- `fix/google-auth-validation`
- `docs/readme-consumption-guide`

## Convenciones del proyecto

- Usa TypeScript y patrones propios de NestJS.
- Manten DTOs, validaciones y decoradores Swagger sincronizados.
- No introduzcas endpoints o parametros no documentados.
- Conserva el contrato HTTP consistente con los codigos de estado existentes.
- No subas secretos ni archivos `.env`.
- Si cambias comportamiento observable, actualiza `README.md` y `CONSUMPTION.md`.

## Validacion antes de abrir cambios

Ejecuta como minimo:

```bash
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

Si tu cambio solo afecta documentacion, indica expresamente en el PR que no fue necesario ejecutar la bateria completa.

## Cambios en la API

Si anades o modificas endpoints, payloads o reglas de negocio publicas:

- actualiza decoradores Swagger para que `/docs` y `/docs-json` sigan siendo la fuente de verdad
- revisa DTOs, validaciones y respuestas documentadas
- actualiza ejemplos en `README.md`
- actualiza la guia de consumo en `CONSUMPTION.md`
- anade o ajusta tests e2e si el contrato HTTP cambia

## Pull requests

Un buen PR en este repositorio deberia incluir:

- contexto del problema o necesidad
- resumen breve de la solucion
- alcance exacto del cambio
- evidencia de validacion local
- notas sobre compatibilidad o cambios rompientes, si aplican

Checklist recomendada:

- [ ] el cambio compila
- [ ] los tests relevantes pasan
- [ ] la documentacion publica esta actualizada
- [ ] no se incluyen secretos ni archivos temporales
- [ ] el cambio esta limitado al objetivo del PR
