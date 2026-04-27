'use client'

import { useState } from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  Font,
} from '@react-pdf/renderer'
import { Download, Loader2 } from 'lucide-react'

// ── Estilos del PDF ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 45,
    backgroundColor: '#ffffff',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#0d3d7a',
  },
  headerLeft: {
    flexDirection: 'column',
  },
  logoText: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#0d3d7a',
    letterSpacing: 2,
  },
  logoSubtitle: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  headerDate: {
    fontSize: 9,
    color: '#64748b',
  },
  // Sección
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0d3d7a',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  // Fila de datos
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    fontSize: 9,
    color: '#64748b',
    width: 140,
    fontFamily: 'Helvetica-Bold',
  },
  value: {
    fontSize: 9,
    color: '#1e293b',
    flex: 1,
  },
  // Resumen IA
  resumenBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#0d3d7a',
  },
  resumenText: {
    fontSize: 9,
    color: '#334155',
    lineHeight: 1.6,
  },
  // Tabla adherencia
  table: {
    marginTop: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0d3d7a',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 2,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    fontSize: 8,
    color: '#334155',
    flex: 1,
  },
  tableCellRed: {
    fontSize: 8,
    color: '#dc2626',
    flex: 1,
    fontFamily: 'Helvetica-Bold',
  },
  tableCellGreen: {
    fontSize: 8,
    color: '#16a34a',
    flex: 1,
    fontFamily: 'Helvetica-Bold',
  },
  tableCellAmber: {
    fontSize: 8,
    color: '#d97706',
    flex: 1,
    fontFamily: 'Helvetica-Bold',
  },
  // Síntomas
  sintomaChip: {
    backgroundColor: '#fef3c7',
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 4,
  },
  sintomaText: {
    fontSize: 8,
    color: '#92400e',
  },
  sintomasRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 45,
    right: 45,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerText: {
    fontSize: 7,
    color: '#94a3b8',
  },
  // Badge adherencia
  badgeGreen: {
    backgroundColor: '#dcfce7',
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeAmber: {
    backgroundColor: '#fef9c3',
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeRed: {
    backgroundColor: '#fee2e2',
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
})

// ── Tipos ──────────────────────────────────────────────────────────────────

interface Registro {
  fecha: string
  presion_sistolica: number | null
  presion_diastolica: number | null
  medicamento_tomado: boolean
  dolor_cabeza: number | null
  mareos: boolean
  hinchazon: boolean
  bienestar_general: number
  notas: string | null
}

interface Props {
  pacienteNombre: string
  pacienteEnfermedad?: string
  medicoNombre: string
  codigoMedico: string
  registros: Registro[]
  resumenIA: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function calcularAdherenciaSemanal(registros: Registro[]) {
  const semanas: { semana: string; total: number; tomados: number; pct: number }[] = []
  const ordenados = [...registros].reverse()
  for (let i = 0; i < ordenados.length; i += 7) {
    const semana = ordenados.slice(i, i + 7)
    const tomados = semana.filter(r => r.medicamento_tomado).length
    semanas.push({
      semana: `Semana ${Math.floor(i / 7) + 1}`,
      total: semana.length,
      tomados,
      pct: Math.round((tomados / semana.length) * 100),
    })
  }
  return semanas
}

function sintomasFrecuentes(registros: Registro[]) {
  const total = registros.length
  const sintomas = [
    { nombre: 'Dolor de cabeza', count: registros.filter(r => r.dolor_cabeza && r.dolor_cabeza >= 3).length },
    { nombre: 'Mareos', count: registros.filter(r => r.mareos).length },
    { nombre: 'Hinchazón', count: registros.filter(r => r.hinchazon).length },
  ].filter(s => s.count > 0)
  return sintomas.map(s => ({
    ...s,
    pct: Math.round((s.count / total) * 100),
  }))
}

// ── Documento PDF ──────────────────────────────────────────────────────────

function KoraPDF({ pacienteNombre, pacienteEnfermedad, medicoNombre, codigoMedico, registros, resumenIA }: Props) {
  const hoy = new Date().toLocaleDateString('es-PE', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const total = registros.length
  const tomados = registros.filter(r => r.medicamento_tomado).length
  const adherenciaTotal = total > 0 ? Math.round((tomados / total) * 100) : 0
  const semanas = calcularAdherenciaSemanal(registros)
  const sintomas = sintomasFrecuentes(registros)

  const conPresion = registros.filter(r => r.presion_sistolica)
  const presionPromS = conPresion.length > 0
    ? Math.round(conPresion.reduce((s, r) => s + (r.presion_sistolica ?? 0), 0) / conPresion.length)
    : null
  const presionPromD = conPresion.length > 0
    ? Math.round(conPresion.reduce((s, r) => s + (r.presion_diastolica ?? 0), 0) / conPresion.length)
    : null

  const notasPaciente = registros
    .filter(r => r.notas && r.notas.trim())
    .slice(0, 5)

  const periodoInicio = registros.length > 0
    ? new Date(registros[registros.length - 1].fecha).toLocaleDateString('es-PE')
    : '—'
  const periodoFin = registros.length > 0
    ? new Date(registros[0].fecha).toLocaleDateString('es-PE')
    : '—'

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.logoText}>KORA</Text>
            <Text style={styles.logoSubtitle}>Plataforma de seguimiento clínico entre consultas</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerDate}>Generado: {hoy}</Text>
            <Text style={[styles.headerDate, { marginTop: 2 }]}>Dr. {medicoNombre}</Text>
            <Text style={[styles.headerDate, { marginTop: 1 }]}>Código: {codigoMedico}</Text>
          </View>
        </View>

        {/* Datos del paciente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del paciente</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre:</Text>
            <Text style={styles.value}>{pacienteNombre}</Text>
          </View>
          {pacienteEnfermedad && (
            <View style={styles.row}>
              <Text style={styles.label}>Diagnóstico:</Text>
              <Text style={styles.value}>{pacienteEnfermedad}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Período del reporte:</Text>
            <Text style={styles.value}>{periodoInicio} — {periodoFin}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total de registros:</Text>
            <Text style={styles.value}>{total} días</Text>
          </View>
        </View>

        {/* Resumen IA */}
        {resumenIA ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumen ejecutivo (generado por IA)</Text>
            <View style={styles.resumenBox}>
              <Text style={styles.resumenText}>{resumenIA}</Text>
            </View>
          </View>
        ) : null}

        {/* Métricas clínicas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Métricas clínicas</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Adherencia general:</Text>
            <Text style={[
              styles.value,
              adherenciaTotal >= 80 ? { color: '#16a34a', fontFamily: 'Helvetica-Bold' } :
              adherenciaTotal >= 50 ? { color: '#d97706', fontFamily: 'Helvetica-Bold' } :
              { color: '#dc2626', fontFamily: 'Helvetica-Bold' }
            ]}>
              {adherenciaTotal}% ({tomados}/{total} días)
            </Text>
          </View>
          {presionPromS && (
            <View style={styles.row}>
              <Text style={styles.label}>Presión promedio:</Text>
              <Text style={styles.value}>{presionPromS}/{presionPromD} mmHg</Text>
            </View>
          )}
        </View>

        {/* Tabla adherencia por semana */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adherencia al medicamento por semana</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>Semana</Text>
              <Text style={styles.tableHeaderCell}>Días registrados</Text>
              <Text style={styles.tableHeaderCell}>Días tomó medic.</Text>
              <Text style={styles.tableHeaderCell}>Adherencia</Text>
            </View>
            {semanas.map((s, i) => (
              <View key={i} style={[styles.tableRow, i % 2 !== 0 ? styles.tableRowAlt : {}]}>
                <Text style={styles.tableCell}>{s.semana}</Text>
                <Text style={styles.tableCell}>{s.total}</Text>
                <Text style={styles.tableCell}>{s.tomados}</Text>
                <Text style={
                  s.pct >= 80 ? styles.tableCellGreen :
                  s.pct >= 50 ? styles.tableCellAmber :
                  styles.tableCellRed
                }>{s.pct}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Síntomas frecuentes */}
        {sintomas.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Síntomas más frecuentes</Text>
            <View style={styles.sintomasRow}>
              {sintomas.map((s, i) => (
                <View key={i} style={styles.sintomaChip}>
                  <Text style={styles.sintomaText}>
                    {s.nombre}: {s.count} días ({s.pct}%)
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Notas del paciente */}
        {notasPaciente.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notas del paciente</Text>
            {notasPaciente.map((r, i) => (
              <View key={i} style={[styles.row, { marginBottom: 6 }]}>
                <Text style={styles.label}>
                  {new Date(r.fecha).toLocaleDateString('es-PE')}:
                </Text>
                <Text style={styles.value}>"{r.notas}"</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Generado por KORA — plataforma de seguimiento clínico entre consultas
          </Text>
          <Text style={styles.footerText}>{hoy}</Text>
        </View>

      </Page>
    </Document>
  )
}

// ── Componente botón exportar ──────────────────────────────────────────────

export default function ExportarPDF(props: Props) {
  const [listo, setListo] = useState(false)

  const nombreArchivo = `KORA_${props.pacienteNombre.replace(/\s+/g, '_')}_${
    new Date().toISOString().split('T')[0]
  }.pdf`

  return (
    <PDFDownloadLink
      document={<KoraPDF {...props} />}
      fileName={nombreArchivo}
      onLoadingComplete={() => setListo(true)}
    >
      {({ loading }) => (
        <button
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            loading
              ? 'bg-gray-100 text-gray-400 cursor-wait'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm'
          }`}
        >
          {loading
            ? <Loader2 size={15} className="animate-spin" />
            : <Download size={15} />
          }
          {loading ? 'Preparando PDF...' : 'Exportar PDF'}
        </button>
      )}
    </PDFDownloadLink>
  )
}