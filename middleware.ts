import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware de autenticación.
 *
 * REGLA: NO hacer llamadas de red bloqueantes ni queries a tablas aquí.
 * El edge se ejecuta antes de cada página; cualquier round-trip lento
 * (Supabase pausado, latencia de Auth) se convierte en un 504 global.
 *
 * - `getSession()` lee el JWT directamente de la cookie (no llama a
 *   /auth/v1/user). Solo refresca el token si ya expiró.
 * - El middleware NO decide el rol: el rol vive en `profiles` (fuente de
 *   verdad) y no siempre está en el JWT. La redirección "ya logueado →
 *   su dashboard" la resuelve la página /login en cliente. Aquí solo
 *   protegemos las rutas que exigen sesión.
 * - El matcher (abajo) limita la ejecución solo a rutas protegidas.
 *   Login/register, assets, API, landing y públicas quedan fuera.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Lectura ligera del JWT desde la cookie. Sin red en el camino normal.
  const { data: { session } } = await supabase.auth.getSession()

  // Sin sesión en una ruta protegida → login. (El matcher ya garantiza
  // que solo llegamos aquí en /paciente/* y /medico/*.)
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  // Solo rutas protegidas. Login/register se resuelven en cliente; API,
  // assets, landing y públicas ni invocan el middleware.
  matcher: ['/paciente/:path*', '/medico/:path*'],
}
