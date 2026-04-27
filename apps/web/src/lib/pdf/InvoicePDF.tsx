import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1e293b' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  brand: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#16a34a' },
  subtitle: { fontSize: 10, color: '#64748b', marginTop: 2 },
  invoiceLabel: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: '#0f172a', textAlign: 'right' },
  invoiceNum: { fontSize: 10, color: '#64748b', textAlign: 'right', marginTop: 2 },
  section: { flexDirection: 'row', gap: 24, marginBottom: 24 },
  block: { flex: 1 },
  blockLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  blockValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  blockSub: { fontSize: 9, color: '#64748b', marginTop: 1 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginVertical: 16 },
  table: { marginTop: 8 },
  tableHead: { flexDirection: 'row', backgroundColor: '#f8fafc', padding: '8 12', borderRadius: 4 },
  tableRow: { flexDirection: 'row', padding: '10 12', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: 'right' },
  headText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#64748b', textTransform: 'uppercase' },
  cellText: { fontSize: 10, color: '#334155' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 8 },
  totalLabel: { fontSize: 12, color: '#64748b' },
  totalValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  statusPaid: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#16a34a', backgroundColor: '#dcfce7', padding: '3 8', borderRadius: 99 },
  statusPending: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#d97706', backgroundColor: '#fef3c7', padding: '3 8', borderRadius: 99 },
  footer: { position: 'absolute', bottom: 32, left: 40, right: 40 },
  footerText: { fontSize: 8, color: '#94a3b8', textAlign: 'center' },
})

function fmt(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export interface InvoicePDFProps {
  invoice: {
    id: string
    amount_due: number
    amount_paid: number
    status: string
    due_date: string
    created_at: string
  }
  bill: {
    billing_period_start: string
    billing_period_end: string
    bill_types: { name: string; category: string } | null
  } | null
  unit: { unit_number: string; properties: { name: string; address: string } | null } | null
  resident: { full_name: string | null; email: string } | null
  propertyManager: string
}

export function InvoicePDF({ invoice, bill, unit, resident, propertyManager }: InvoicePDFProps) {
  const remaining = invoice.amount_due - invoice.amount_paid
  const billType = bill?.bill_types
  const property = unit?.properties

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>AptKeeper</Text>
            <Text style={s.subtitle}>Apartment Management Platform</Text>
          </View>
          <View>
            <Text style={s.invoiceLabel}>INVOICE</Text>
            <Text style={s.invoiceNum}>#{invoice.id.slice(0, 8).toUpperCase()}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Property & Resident */}
        <View style={s.section}>
          <View style={s.block}>
            <Text style={s.blockLabel}>Property</Text>
            <Text style={s.blockValue}>{property?.name ?? '—'}</Text>
            <Text style={s.blockSub}>{property?.address ?? ''}</Text>
            <Text style={s.blockSub}>Managed by {propertyManager}</Text>
          </View>
          <View style={s.block}>
            <Text style={s.blockLabel}>Billed To</Text>
            <Text style={s.blockValue}>{resident?.full_name || resident?.email || '—'}</Text>
            <Text style={s.blockSub}>{resident?.email}</Text>
            <Text style={s.blockSub}>Unit {unit?.unit_number ?? '—'}</Text>
          </View>
          <View style={s.block}>
            <Text style={s.blockLabel}>Dates</Text>
            <Text style={s.blockSub}>Issued: {fmtDate(invoice.created_at)}</Text>
            <Text style={s.blockSub}>Due: {fmtDate(invoice.due_date)}</Text>
            {bill && (
              <Text style={s.blockSub}>
                Period: {fmtDate(bill.billing_period_start)} – {fmtDate(bill.billing_period_end)}
              </Text>
            )}
          </View>
        </View>

        <View style={s.divider} />

        {/* Line items */}
        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={[s.headText, s.col1]}>Description</Text>
            <Text style={[s.headText, s.col2]}>Amount</Text>
          </View>
          <View style={s.tableRow}>
            <View style={s.col1}>
              <Text style={s.cellText}>{billType?.name ?? 'Bill'}</Text>
              {billType?.category && (
                <Text style={{ fontSize: 8, color: '#94a3b8', marginTop: 2, textTransform: 'capitalize' }}>
                  {billType.category}
                </Text>
              )}
            </View>
            <Text style={[s.cellText, s.col2]}>{fmt(invoice.amount_due)}</Text>
          </View>
          {invoice.amount_paid > 0 && (
            <View style={s.tableRow}>
              <Text style={[s.cellText, s.col1, { color: '#16a34a' }]}>Payment received</Text>
              <Text style={[s.cellText, s.col2, { color: '#16a34a' }]}>-{fmt(invoice.amount_paid)}</Text>
            </View>
          )}
        </View>

        {/* Total */}
        <View style={s.divider} />
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>
            {invoice.status === 'paid' ? 'Total Paid' : 'Balance Due'}
          </Text>
          <Text style={s.totalValue}>
            {invoice.status === 'paid' ? fmt(invoice.amount_paid) : fmt(remaining)}
          </Text>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            Thank you for using AptKeeper. Questions? Contact your property manager.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
