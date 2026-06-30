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
 * - El rol se lee de los claims del JWT (`user_metadata.role`), nunca
 *   de la tabla `profiles`.
 * - El matcher (abajo) limita la ejecución a las rutas que de verdad
 *   necesitan auth: protegidas + login/register. Assets, API, landing y
 *   páginas públicas quedan fuera para reducir invocaciones.
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

  const { pathname } = request.nextUrl
  const isProtected =
    pathname.startsWith('/paciente') || pathname.startsWith('/medico')

  // Sin sesión + ruta protegida → login
  if (!session && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Con sesión + en login/register → su dashboard.
  // El rol sale del JWT (user_metadata/app_metadata), sin tocar la BD.
  if (session && (pathname === '/login' || pathname === '/register')) {
    const role =
      session.user.user_metadata?.role ?? session.user.app_metadata?.role
    const destino =
      role === 'medico' ? '/medico/dashboard' : '/paciente/dashboard'
    return NextResponse.redirect(new URL(destino, request.url))
  }

  return supabaseResponse
}

export const config = {
  // Solo donde se necesita auth. Excluye API, assets, landing y públicas
  // (no aparecen aquí, así que el middleware ni se invoca para ellas).
  matcher: ['/paciente/:path*', '/medico/:path*', '/login', '/register'],
}
