# buffet-allergen-system

Sistema de gestión de alérgenos para buffets (hoteles/restaurantes), en
producción con clientes reales de pago. Backend Express (`server.js`) +
Supabase (Postgres) + frontend estático en `public/` (JS inline en HTML).
Deploy: GitHub → Vercel, automático al hacer push a `main`.

## Reglas de autorización

- **`git push` y `git commit` requieren SIEMPRE confirmación manual explícita
  en el chat antes de ejecutarse.** Nunca autoejecutar un push, aunque una
  sesión anterior ya lo haya aprobado. Cada push es una acción nueva a
  confirmar.
- No usar `--force`, `git reset --hard`, ni ningún flag destructivo sobre
  `main` sin pedir permiso explícito y explicar el motivo primero.
- El sistema de licencias (`checkLicenseWithDevice`, `checkAdmin`) y el panel
  de administración (`public/admin.html`) son funcionalidad comercial en uso
  por clientes reales — no se deben romper. Cualquier cambio que los toque
  debe señalarse explícitamente antes de aplicarse.
- El `README.md` del repo está desactualizado (describe una versión antigua,
  v4.0.0 "todo en memoria"). El estado real es el de `server.js`
  (v9.0.0 en `package.json`), con Supabase, licencias y la integración con
  pantallas Sertag ya implementadas. No fiarse del README sin verificar
  contra el código.
