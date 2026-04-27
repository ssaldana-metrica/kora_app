# KORA — Guía Completa: Deploy, PWA, Médicos Piloto

---

## ✅ ESTADO DE TU SUPABASE (revisado hoy)

Todo está correcto. Se encontraron y corrigieron 2 problemas:

1. **Columnas faltantes** — `fecha_nacimiento` y `enfermedad` en `profiles` no existían. **YA AGREGADAS.**
2. **Tabla de tracking** — `eventos_tracking` no existía. **YA CREADA** con sus políticas RLS.

Tablas existentes: `profiles`, `registros`, `documentos`, `medicamentos`, `resumenes`, `eventos_tracking`  
Datos actuales: 1 médico, 1 paciente, 6 registros (24–27 abril 2026) ✅

---

## PASO 1 — DEPLOY EN VERCEL (paso a paso)

### 1A. Subir código a GitHub

Abre tu terminal en la carpeta del proyecto y ejecuta estos comandos **uno por uno**, esperando que cada uno termine:

```bash
# 1. Inicializar git (si no lo has hecho)
git init

# 2. Agregar todos los archivos
git add .

# 3. Primer commit
git commit -m "KORA MVP v1.0 — listo para deploy"

# 4. Ir a github.com → New repository
# Nombre: kora-app
# Privado: SÍ (importante — tiene credenciales)
# NO marques "Add README"

# 5. Conectar con GitHub (reemplaza TU_USUARIO con tu usuario de GitHub)
git remote add origin https://github.com/TU_USUARIO/kora-app.git
git branch -M main
git push -u origin main
```

### 1B. Conectar con Vercel

1. Ve a **vercel.com** → "Add New Project"
2. Elige "Import Git Repository" → selecciona `kora-app`
3. Framework: **Next.js** (se detecta automático)
4. Root Directory: dejar en blanco (raíz)
5. **NO presiones Deploy todavía** — primero las variables de entorno

### 1C. Variables de entorno en Vercel

En el paso de configuración de Vercel, agrega estas variables (están en tu `.env.local`):

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://zjlxcmbrceeeaayfybtn.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | tu anon key de Supabase |
| `ANTHROPIC_API_KEY` | tu API key de Anthropic |

> Para encontrar tus keys de Supabase: supabase.com → tu proyecto → Settings → API

### 1D. Deploy

Presiona "Deploy". Vercel tarda ~3 minutos. Al terminar te da una URL como `kora-app.vercel.app`.

### 1E. Configurar URL en Supabase

En Supabase → Authentication → URL Configuration:
- **Site URL**: `https://kora-app.vercel.app`
- **Redirect URLs**: `https://kora-app.vercel.app/**`

### 1F. Dominio custom (opcional)

En Vercel → tu proyecto → Settings → Domains → Add Domain → escribe `kora.app` o el que tengas.

---

## PASO 2 — ARCHIVOS NUEVOS QUE DEBES AGREGAR AL PROYECTO

Estos archivos han sido generados y están listos para copiar:

### Archivos en `public/`
- `public/manifest.json` — configuración PWA
- `public/sw.js` — service worker para funcionamiento offline

### Archivos en `app/`
- `app/layout.tsx` — **REEMPLAZA** el existente (agrega meta tags PWA)
- `app/offline/page.tsx` — página sin conexión

### Archivos en `components/`
- `components/ServiceWorkerRegistration.tsx` — registra el SW automáticamente

### Archivos en `lib/`
- `lib/tracking.ts` — función `trackEvent()` para analytics

### Páginas nuevas
- `app/onboarding-medico/page.tsx` — guía para médicos nuevos
- `app/medico/stats/page.tsx` — estadísticas de uso del médico

### Iconos PWA (debes crearlos tú)

Necesitas dos imágenes PNG para los íconos de la app:
- `public/icons/icon-192.png` (192×192 px)
- `public/icons/icon-512.png` (512×512 px)

**Opción rápida:** Ve a [favicon.io](https://favicon.io/favicon-generator/) → escribe "K", fondo azul `#1a56a4`, texto blanco → descarga y renombra los archivos.

---

## PASO 3 — CHECKLIST DE PRUEBAS ANTES DE MOSTRAR A MÉDICOS

Haz estas pruebas tú mismo en el link de producción (kora-app.vercel.app):

### Flujo Paciente
- [ ] Abrir `/register` → crear cuenta con rol "Paciente"
- [ ] Login como paciente → llega al dashboard
- [ ] Ir a `/paciente/registrar` → completar los 6 pasos → guardar
- [ ] Ver `/paciente/historial` → aparece el registro de hoy
- [ ] Ir a `/paciente/perfil` → vincular médico con código del médico de prueba
- [ ] Subir un documento en `/paciente/documentos` (foto de cualquier cosa)
- [ ] Verificar que el documento aparece en la lista

### Flujo Médico
- [ ] Crear cuenta con rol "Médico" → llega al dashboard médico
- [ ] Ver el código único KORA en el dashboard → copiarlo
- [ ] Vincular el paciente de prueba con ese código (desde la cuenta paciente)
- [ ] Refrescar el dashboard médico → aparece el paciente
- [ ] Entrar al detalle del paciente → probar pestaña "Resumen IA"
- [ ] Hacer una pregunta al agente KORA
- [ ] Ver pestaña "Gráficos" → se ven los charts
- [ ] Ver pestaña "Registros" → aparece la tabla
- [ ] Exportar PDF → se descarga correctamente

### Prueba celular
- [ ] Abrir la URL en iPhone → aparece banner "Agregar a inicio" → instalar
- [ ] Abrir la URL en Android → aparece prompt de instalación → instalar
- [ ] La app instalada se ve sin barra del browser (fullscreen)
- [ ] Probar `/paciente/registrar` en celular → todos los pasos funcionan en táctil

### Prueba de páginas nuevas
- [ ] Abrir `/onboarding-medico` → los 4 pasos se expanden
- [ ] Copiar mensaje de WhatsApp → funciona el botón
- [ ] Abrir `/medico/stats` → aparecen las estadísticas
- [ ] Abrir `/offline` → se ve la página de sin conexión

---

## PASO 4 — DÓNDE AGREGAR EL TRACKING

Para que `trackEvent()` funcione, agrega las llamadas en los lugares clave:

### En `/app/register/page.tsx`
Después de crear el perfil exitosamente:
```typescript
import { trackEvent } from '@/lib/tracking'

// Después del insert en profiles:
await trackEvent(role === 'medico' ? 'medico_crea_cuenta' : 'paciente_crea_cuenta', {
  userId: data.user.id,
})
```

### En `/app/paciente/registrar/page.tsx`
Después del insert en registros exitoso:
```typescript
import { trackEvent } from '@/lib/tracking'

// Después del insert exitoso:
await trackEvent('registro_completado', { userId: user.id })
```

### En `/app/paciente/perfil/page.tsx`
Después de vincular médico:
```typescript
// Después del update exitoso:
await trackEvent('paciente_vinculado', { userId: userId, medicoId: medico.id })
```

### En `/app/medico/paciente/[id]/page.tsx`
En `generarResumen()` después de recibir la respuesta:
```typescript
await trackEvent('resumen_generado', { medicoId: user.id, metadata: { pacienteId } })
```

En `ExportarPDF` (al hacer clic en descargar):
```typescript
await trackEvent('pdf_exportado', { medicoId: user.id })
```

---

## PASO 5 — MENSAJES PARA CONSEGUIR 30 MÉDICOS

### Mensaje WhatsApp (< 5 líneas)
```
Hola [nombre], soy [tu nombre]. Estoy desarrollando KORA, una app gratuita que le muestra a los médicos cómo están sus pacientes entre consultas (presión, medicamentos, síntomas).

Busco 30 médicos piloto. Es 100% gratis y tarda 5 min configurar.

¿Te mando el link para probarlo?
```

### Email (asunto + cuerpo)
**Asunto:** KORA — seguimiento de pacientes entre consultas (piloto gratuito)

```
Hola Dr./Dra. [apellido]:

Estoy desarrollando KORA, una plataforma que permite a los médicos ver el estado de sus pacientes entre consultas: presión arterial, adherencia al medicamento y síntomas, todo en un resumen generado por IA antes de cada cita.

Estoy buscando 30 médicos para el piloto gratuito de mayo.

¿Le puedo enviar el link para probarlo esta semana?

Saludos,
[Tu nombre]
```

### Qué hacer cuando digan "sí"
1. Manda el link: `kora-app.vercel.app/onboarding-medico`
2. La guía explica todo paso a paso sin que tengas que estar presente.

---

## RESUMEN: ORDEN DE EJECUCIÓN

1. **Agrega los archivos nuevos** al proyecto (los que están en la carpeta de outputs)
2. **Crea los íconos** en `public/icons/` (icon-192.png, icon-512.png)
3. **Sube a GitHub** (`git add . && git commit -m "PWA + onboarding" && git push`)
4. **Conecta con Vercel** → agrega las 3 variables de entorno → Deploy
5. **Configura la URL** en Supabase Authentication
6. **Haz el checklist** de pruebas
7. **Agrega el tracking** en los 5 lugares indicados
8. **Manda mensajes** a médicos con el link `/onboarding-medico`

---

*Generado para KORA MVP — Chat 4 — Abril 2026*