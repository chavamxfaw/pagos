import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components'

interface PaymentReceiptEmailProps {
  clientName: string
  concept: string
  paymentAmount: number
  paymentDate: string
  paidAmount: number
  totalAmount: number
  token: string
  appUrl: string
}

function fmt(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)
}

function fmtDate(date: string) {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function PaymentReceiptEmail({
  clientName,
  concept,
  paymentAmount,
  paymentDate,
  paidAmount,
  totalAmount,
  token,
  appUrl,
}: PaymentReceiptEmailProps) {
  const remaining = totalAmount - paidAmount
  const percent = Math.min(100, Math.round((paidAmount / totalAmount) * 100))
  const isCompleted = paidAmount >= totalAmount
  const statusLink = `${appUrl}/p/${token}`

  return (
    <Html>
      <Head />
      <Preview>Recibo de abono — {concept}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>Recibo de abono</Heading>
          <Text style={greeting}>Hola {clientName},</Text>
          <Text style={text}>
            Registramos un abono para tu orden: <strong>{concept}</strong>
          </Text>

          {/* Monto del abono */}
          <Section style={amountBox}>
            <Text style={amountLabel}>Monto abonado</Text>
            <Text style={amountValue}>{fmt(paymentAmount)}</Text>
            <Text style={amountDate}>{fmtDate(paymentDate)}</Text>
          </Section>

          <Hr style={hr} />

          {/* Resumen de saldo */}
          <Row>
            <Section style={summaryRow}>
              <Text style={summaryLabel}>Total de la orden</Text>
              <Text style={summaryValue}>{fmt(totalAmount)}</Text>
            </Section>
            <Section style={summaryRow}>
              <Text style={summaryLabel}>Total pagado</Text>
              <Text style={{ ...summaryValue, color: '#10b981' }}>{fmt(paidAmount)}</Text>
            </Section>
            <Section style={summaryRow}>
              <Text style={summaryLabel}>Saldo restante</Text>
              <Text style={{ ...summaryValue, color: isCompleted ? '#10b981' : '#f59e0b' }}>
                {isCompleted ? '¡Liquidado!' : fmt(remaining)}
              </Text>
            </Section>
          </Row>

          {/* Barra de progreso (HTML tables para compatibilidad) */}
          <Section style={{ margin: '24px 0' }}>
            <Text style={{ ...summaryLabel, marginBottom: '8px' }}>Progreso: {percent}%</Text>
            <table width="100%" cellPadding={0} cellSpacing={0}>
              <tr>
                <td
                  width={`${percent}%`}
                  style={{
                    height: '12px',
                    backgroundColor: '#10b981',
                    borderRadius: percent === 100 ? '6px' : '6px 0 0 6px',
                  }}
                />
                {percent < 100 && (
                  <td
                    width={`${100 - percent}%`}
                    style={{
                      height: '12px',
                      backgroundColor: '#27272a',
                      borderRadius: '0 6px 6px 0',
                    }}
                  />
                )}
              </tr>
            </table>
          </Section>

          {isCompleted && (
            <Section style={completedBanner}>
              <Text style={completedText}>¡Tu orden está completamente liquidada! Gracias.</Text>
            </Section>
          )}

          <Hr style={hr} />

          <Text style={text}>
            Puedes ver tu estado de cuenta actualizado en cualquier momento:
          </Text>
          <Link href={statusLink} style={button}>
            Ver mi estado de cuenta
          </Link>

          {isCompleted && (
            <Text style={footerNote}>
              Nota: este enlace estará disponible por 30 días a partir de la fecha de liquidación.
            </Text>
          )}

          <Hr style={hr} />
          <Text style={footer}>Cobros · Sistema de pagos</Text>
        </Container>
      </Body>
    </Html>
  )
}

const body = {
  backgroundColor: '#09090b',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

const container = {
  margin: '40px auto',
  padding: '40px',
  maxWidth: '560px',
  backgroundColor: '#18181b',
  borderRadius: '12px',
  border: '1px solid #27272a',
}

const h1 = {
  color: '#fafafa',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 24px',
}

const greeting = {
  color: '#a1a1aa',
  fontSize: '16px',
  margin: '0 0 8px',
}

const text = {
  color: '#d4d4d8',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 16px',
}

const amountBox = {
  backgroundColor: '#09090b',
  borderRadius: '8px',
  padding: '24px',
  textAlign: 'center' as const,
  border: '1px solid #10b981',
  margin: '24px 0',
}

const amountLabel = {
  color: '#a1a1aa',
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '0 0 4px',
}

const amountValue = {
  color: '#10b981',
  fontSize: '36px',
  fontWeight: '700',
  fontFamily: 'monospace',
  margin: '0',
}

const amountDate = {
  color: '#71717a',
  fontSize: '12px',
  margin: '8px 0 0',
}

const hr = {
  borderColor: '#27272a',
  margin: '24px 0',
}

const summaryRow = {
  display: 'inline-block' as const,
  width: '33%',
  textAlign: 'center' as const,
}

const summaryLabel = {
  color: '#71717a',
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '0 0 4px',
}

const summaryValue = {
  color: '#fafafa',
  fontSize: '16px',
  fontWeight: '600',
  fontFamily: 'monospace',
  margin: '0',
}

const completedBanner = {
  backgroundColor: '#052e16',
  borderRadius: '8px',
  padding: '16px',
  border: '1px solid #10b981',
  margin: '16px 0',
}

const completedText = {
  color: '#10b981',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
  textAlign: 'center' as const,
}

const button = {
  display: 'block',
  backgroundColor: '#10b981',
  color: '#fff',
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '16px 0',
}

const footerNote = {
  color: '#52525b',
  fontSize: '11px',
  textAlign: 'center' as const,
  margin: '8px 0',
}

const footer = {
  color: '#52525b',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '0',
}
