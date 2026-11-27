# SpaceHub API

API para manejar los espacios, reservas y membresías de SpaceHub Coworking. Está hecha con Node.js, Express, PostgreSQL y Prisma.

## Cómo instalarlo

1. Instalar las dependencias:

```bash
npm install
```

2. Copiar el archivo `.env.example` y renombrarlo a `.env`. Después llenar los valores:

- `DATABASE_URL`: la conexión a tu base de datos PostgreSQL
- `JWT_SECRET`: una clave secreta, entre más larga mejor
- `PORT`: el puerto del servidor (3000)
- `ADMIN_NAME`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`: los datos del administrador (se usan en el paso 4)

3. Crear las tablas en la base de datos:

```bash
npx prisma migrate dev
```

4. Crear el administrador:

```bash
npm run seed
```

## Cómo correrlo

```bash
npm run dev
```

Con el servidor corriendo se puede entrar a:

- Documentación de la API: http://localhost:3000/api/docs
- GraphQL: http://localhost:3000/api/graphql

## Crear un administrador

Todos los usuarios que se registran son miembros. El administrador se crea con `npm run seed`, que usa los datos de `ADMIN_EMAIL` y `ADMIN_PASSWORD` del archivo `.env`. Solo se ejecuta a mano, el servidor nunca lo hace solo. Si el correo ya existe, ese usuario pasa a ser administrador.

También se puede hacer directo en la base de datos:

```sql
UPDATE "User" SET role = 'admin' WHERE email = 'correo@ejemplo.com';
```

Después hay que iniciar sesión otra vez para que el token nuevo tenga el rol de administrador.

## Cómo usar la API

Primero se crea una cuenta con `/api/auth/register` y se inicia sesión con `/api/auth/login`. El login devuelve un token que se manda en el header de las demás peticiones:

```
Authorization: Bearer <token>
```

Todos los endpoints están explicados en la documentación (`/api/docs`).

## GraphQL

Se usa para ver la disponibilidad de los espacios en tiempo real y para las analíticas de los administradores. Se puede probar en el playground de `/api/graphql`.

## Pruebas

Las pruebas están hechas con Bruno y están en la carpeta `bruno/`. Con el servidor corriendo, en otra terminal:

```bash
npm run test:api
```

Las pruebas usan el administrador de `bruno/environments/local.bru`. Tiene que ser el mismo que está en `ADMIN_EMAIL` y `ADMIN_PASSWORD` del `.env`, y haber corrido `npm run seed` antes.
