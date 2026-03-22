---
description: Create a new API CRUD feature (Model, Validation, Service, Controller, Route)
---

# Workflow: Generate a CRUD Feature

Follow these steps exactly whenever the user requests a new feature or model (e.g., "create a Cars feature").

1. **Prisma Modeling**
   - Update `prisma/schema.prisma` with the new model.
   - Run `npx prisma format` followed by `npx prisma db push`.
   - Run `npx prisma generate` to update `@prisma/client`.

2. **Validation Setup**
   - Open `src/utils/validation.ts`.
   - Add Zod schemas for Creating and Updating the new model.

3. **Service Logic**
   - Create `src/services/[name]Service.ts`.
   - Write functions for `create`, `getAll`, `getById`, `update`, and `delete`.
   - *Rule*: Services handle ALL database interactions and core business logic.
   - *Rule*: Check if any logic here can apply to other files. If YES, extract it into a file in `src/utils/`.

4. **Controller Logic**
   - Create `src/controllers/[name]Controller.ts`.
   - Import the Service and Validation schemas.
   - Write Express handlers that:
     1. Validate `req.body` or `req.params`.
     2. Invoke the corresponding Service function.
     3. Use the `src/utils/response.ts` utility (e.g., `response.ok`, `response.created`) to return data.
   - *Rule*: Controllers must be thin and contain no business logic.

5. **Route Registration**
   - Create `src/routes/[name]Routes.ts`.
   - Import the Express Router, the new Controller, and optionally `authMiddleware` for protection.
   - Wire up the CRUD endpoints (`GET`, `POST`, `PUT`, `DELETE`).

6. **App Registration**
   - Update `src/index.ts`.
   - Import the new Route and mount it (e.g., `app.use('/api/[name]s', [name]Routes);`).

7. **Review & Report**
   - Double check for reusability points.
   - Inform the user that the CRUD cycle is complete.
