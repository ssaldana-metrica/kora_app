# Workers de background

Aquí van los workers para procesamiento en background:
- Notificaciones al paciente (recordar registrar)
- Alertas al médico cuando un paciente está en rojo
- Cualquier tarea asíncrona que no deba bloquear el flujo del usuario

Se implementan como API routes en `app/api/` o como cron jobs de Vercel.
No usar Edge Functions de Supabase para esto.
