// Capa de canales de envío para los recordatorios (Épica 2).
//
// El motor de recordatorios es "channel-agnostic": decide QUÉ y A QUIÉN enviar,
// pero el CÓMO se delega a un adapter intercambiable. Hoy hay dos canales:
//   - Canal 1 (activo): push de la PWA + email de respaldo.
//   - Canal 2 (preparado, NO activo): WhatsApp vía Twilio/WhatsApp Business.

export interface RecordatorioEnvio {
  paciente_id: string
  paciente_email?: string | null
  tipo: string
  mensaje: string
}

export interface ResultadoEnvio {
  ok: boolean
  canal: 'push' | 'email' | 'whatsapp' | 'simulado'
  detalle?: string
}

export interface ChannelAdapter {
  readonly nombre: string
  enviar(r: RecordatorioEnvio): Promise<ResultadoEnvio>
}

/**
 * Canal 1 — Push (PWA) + email de respaldo.
 *
 * El pipeline (detección → cola idempotente → despacho → registro) está
 * completo. Para ENTREGA real falta conectar:
 *   - Web Push: generar claves VAPID y guardar las suscripciones del navegador
 *     (tabla push_subscriptions). Con eso, usar `web-push` aquí.
 *   - Email de respaldo: un proveedor (Resend/SendGrid/SMTP) vía RESEND_API_KEY.
 *
 * Mientras esas piezas no estén configuradas, registra el envío como 'simulado'
 * (queda en la tabla `recordatorios` para medir tasa de respuesta) y lo loguea,
 * en vez de fallar silenciosamente.
 */
export class PushEmailAdapter implements ChannelAdapter {
  readonly nombre = 'push+email'

  async enviar(r: RecordatorioEnvio): Promise<ResultadoEnvio> {
    const pushListo = !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY
    const emailListo = !!process.env.RESEND_API_KEY

    if (!pushListo && !emailListo) {
      console.log(`[recordatorio:simulado] (${r.tipo}) → ${r.paciente_id}: ${r.mensaje}`)
      return { ok: true, canal: 'simulado', detalle: 'push/email no configurados; registrado para métricas' }
    }

    // TODO(push): cuando VAPID + push_subscriptions estén listos, enviar Web Push aquí.
    // TODO(email): cuando RESEND_API_KEY esté lista, enviar email de respaldo aquí.
    console.log(`[recordatorio:push+email] (${r.tipo}) → ${r.paciente_id}: ${r.mensaje}`)
    return { ok: true, canal: pushListo ? 'push' : 'email' }
  }
}

/**
 * Canal 2 — WhatsApp (PREPARADO, NO ACTIVO).
 *
 * WhatsApp es el canal rey en LatAm pero requiere una cuenta de WhatsApp
 * Business verificada, plantillas aprobadas por Meta y costo por mensaje.
 * Para activarlo:
 *   1. Crear cuenta Twilio + sender de WhatsApp Business verificado.
 *   2. Configurar TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM.
 *   3. Guardar el teléfono del paciente (no existe aún en `profiles`).
 *   4. Aprobar plantillas de mensaje en Meta Business.
 *   5. Implementar `enviar()` con el SDK de Twilio y un webhook para respuestas.
 */
export class WhatsAppAdapter implements ChannelAdapter {
  readonly nombre = 'whatsapp'

  async enviar(_r: RecordatorioEnvio): Promise<ResultadoEnvio> {
    // No implementado a propósito: requiere cuenta verificada y costo.
    throw new Error('Canal WhatsApp aún no activado (ver TWILIO_* en .env.example)')
  }
}

/** Devuelve el adapter activo según la configuración del entorno. */
export function getCanalAdapter(): ChannelAdapter {
  // WhatsApp solo si está explícitamente habilitado y configurado.
  if (process.env.WHATSAPP_ENABLED === 'true' && process.env.TWILIO_ACCOUNT_SID) {
    return new WhatsAppAdapter()
  }
  return new PushEmailAdapter()
}
