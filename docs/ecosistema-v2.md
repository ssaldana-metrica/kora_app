# KORA V2 — Guía del ecosistema

Resumen de lo construido en las 6 épicas y los pasos para dejarlo en producción.

## Qué se construyó

| Épica | Entregable |
|-------|-----------|
| 1 — Núcleo | Resumen IA con regeneración forzada y errores reales; agente médico; foto de receta (IA visión); subida de documentos robusta |
| 6.1 — Registro | Trigger `handle_new_user` + manejo de correo duplicado (ver `registro-y-auth.md`) |
| 4 — Médico | Dashboard priorizado por riesgo, semáforo, **panel de alertas automáticas**, PDF, vista pura |
| 2 — Recordatorios | Motor channel-agnostic (`lib/workers/`), cron de Vercel, tabla `recordatorios` idempotente, respuesta del paciente |
| 3 — Paciente | Racha, página **Mi progreso** (gráfico con zona saludable + IA amable), onboarding de 3 pasos |
| 5 — Demo | Flag `es_demo`, generador `lib/demo/seed-demo.ts`, rutas admin, badge en UI |
| 6 — Pulido | Disclaimers de IA, texto de privacidad, RLS verificada, tracking completo |

## Cuenta demo (ya poblada)

- **Médico demo:** `demo.medico@kora.app` / `KoraDemo2026!` (código `EF1D8D`)
- 15 pacientes peruanos con 30–60 días de historia coherente y riesgo variado
  (de descontrolados con baja adherencia a controlados con alta adherencia).
- Todo marcado `es_demo = true` y visible con el badge "Datos de demostración".

## Variables de entorno (Vercel)

Obligatorias para que todo funcione en producción:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY` — sin esto, resumen IA / agente / receta devuelven 503.
- `SUPABASE_SERVICE_ROLE_KEY` — para el cron de recordatorios y el seed demo.
- `CRON_SECRET` — protege `/api/cron/*` y `/api/admin/*`.

Opcionales: `VAPID_*` (push real), `RESEND_API_KEY` (email), `TWILIO_*` + `WHATSAPP_ENABLED` (WhatsApp).

## Operación

```bash
# Poblar / regenerar el ecosistema demo (idempotente)
curl -X POST https://<app>/api/admin/seed-demo   -H "Authorization: Bearer $CRON_SECRET"
# Borrar TODOS los datos demo de un golpe
curl -X POST https://<app>/api/admin/limpiar-demo -H "Authorization: Bearer $CRON_SECRET"
# Disparar el cron de recordatorios manualmente
curl https://<app>/api/cron/recordatorios -H "Authorization: Bearer $CRON_SECRET"
```

El cron de recordatorios ya está declarado en `vercel.json` (cada hora).

## Pendiente de despliegue

1. **Fusionar la rama** `claude/kora-feedback-changes-u2KAU` a `main`.
2. **Configurar las variables** de entorno en Vercel (lista de arriba).
3. (Opcional) Conectar el canal push/email real reemplazando el adapter
   `PushEmailAdapter` en `lib/workers/channels.ts`.
