# Registro de cuentas y configuración de Auth (Épica 6.1)

## Causa raíz del bug "no deja crear cuentas nuevas"

Con la confirmación de email **activada** en Supabase Auth, `supabase.auth.signUp()`
devuelve `session: null`. Sin sesión, `auth.uid()` es `null`, así que cualquier
`INSERT` del cliente sobre `public.profiles` lo bloqueaba la política RLS
(`new row violates row-level security policy for table "profiles"`).

## Solución implementada

1. **Trigger `on_auth_user_created`** sobre `auth.users` (función
   `public.handle_new_user`, `SECURITY DEFINER`). Crea el perfil automáticamente
   a partir de `raw_user_meta_data`, sin depender de la sesión del cliente.
   - `ON CONFLICT (id) DO UPDATE` corrige el rol/nombre si el perfil ya existía
     (evita que un médico quede registrado como paciente).
   - Genera `codigo_medico` único solo para médicos.
2. **`app/register/page.tsx`** envía los datos en `options.data` (mapea a
   `raw_user_meta_data`) y solo hace `UPDATE` del perfil cuando ya hay sesión.
3. Detecta correo ya registrado (`data.user.identities.length === 0`) y muestra
   un mensaje claro en vez de fingir éxito.

## Configuración requerida en Supabase (manual, una vez)

En **Authentication → URL Configuration**:

- **Site URL:** la URL de producción (p. ej. `https://kora.vercel.app`).
- **Redirect URLs:** añade la URL de producción y los previews de Vercel
  (`https://*.vercel.app`).

Si la confirmación de email está activada, el usuario debe confirmar antes de
poder iniciar sesión; el perfil ya queda creado por el trigger.
