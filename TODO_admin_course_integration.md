# TODO - Admin User & Course (Integración segura)

## Paso 1
- [x] Actualizar `prisma/schema.prisma`: `role` como String (sqlite-compatible) y nuevo modelo `Course` + relación tutor/alumnos.



## Paso 2
- [x] Crear `src/controller/adminUserController.ts` con `updateUser` (admin-only).


## Paso 3
- [x] Crear `src/controller/adminCourseController.ts` con `createCourse`, `assignTutorToCourse`, `enrollStudentsInCourse` (admin-only).

## Paso 4
- [x] Actualizar `src/routes/adminRoutes.ts` para integrar controladores y proteger con `verifyToken` + `isAdmin`.

## Paso 5
- [x] Ejecutar `npx prisma migrate dev` y levantar backend para validar.


