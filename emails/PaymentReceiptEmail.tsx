import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
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
  senderName?: string
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
  senderName,
}: PaymentReceiptEmailProps) {
  const remaining = totalAmount - paidAmount
  const percent = Math.min(100, Math.round((paidAmount / totalAmount) * 100))
  const isCompleted = paidAmount >= totalAmount
  const normalizedAppUrl = appUrl.replace(/\/$/, '')
  const statusLink = `${normalizedAppUrl}/p/${token}`
  const logoUrl = `${normalizedAppUrl}/otla-white.png`

  return (
    <Html>
      <Head />
      <Preview>OTLA · Recibo de abono - {concept}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={brandHeader}>
            <Img src={logoUrl} alt="OTLA" width="150" style={logo} />
          </Section>

          <Section style={content}>
            <Heading style={h1}>Recibo de abono</Heading>
            <Text style={greeting}>Hola {clientName},</Text>
            <Text style={text}>
              Registramos un abono para tu orden: <strong>{concept}</strong>
            </Text>

            <Section style={amountBox}>
              <Text style={amountLabel}>Monto abonado</Text>
              <Text style={amountValue}>{fmt(paymentAmount)}</Text>
              <Text style={amountDate}>{fmtDate(paymentDate)}</Text>
            </Section>

            <Hr style={hr} />

            <Row>
              <Section style={summaryRow}>
                <Text style={summaryLabel}>Total</Text>
                <Text style={summaryValue}>{fmt(totalAmount)}</Text>
              </Section>
              <Section style={summaryRow}>
                <Text style={summaryLabel}>Pagado</Text>
                <Text style={{ ...summaryValue, color: '#2ED39A' }}>{fmt(paidAmount)}</Text>
              </Section>
              <Section style={summaryRow}>
                <Text style={summaryLabel}>Restante</Text>
                <Text style={{ ...summaryValue, color: isCompleted ? '#2ED39A' : '#F4B740' }}>
                  {isCompleted ? 'Liquidado' : fmt(remaining)}
                </Text>
              </Section>
            </Row>

            <Section style={progressSection}>
              <Text style={{ ...summaryLabel, marginBottom: '8px' }}>Progreso: {percent}%</Text>
              <table width="100%" cellPadding={0} cellSpacing={0}>
                <tbody>
                  <tr>
                    <td
                      width={`${percent}%`}
                      style={{
                        height: '12px',
                        backgroundColor: '#6C5CE7',
                        borderRadius: percent === 100 ? '999px' : '999px 0 0 999px',
                      }}
                    />
                    {percent < 100 && (
                      <td
                        width={`${100 - percent}%`}
                        style={{
                          height: '12px',
                          backgroundColor: '#E6EAF0',
                          borderRadius: '0 999px 999px 0',
                        }}
                      />
                    )}
                  </tr>
                </tbody>
              </table>
            </Section>

            {isCompleted && (
              <Section style={completedBanner}>
                <Text style={completedText}>Tu orden está completamente liquidada. Gracias.</Text>
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
            {senderName && (
              <Text style={senderLine}>De parte de: {senderName}</Text>
            )}
            <Text style={footer}>OTLA · Control de pagos</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const body = {
  backgroundColor: '#F5F7FB',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  margin: '0',
}

const container = {
  margin: '40px auto',
  maxWidth: '560px',
  backgroundColor: '#FFFFFF',
  borderRadius: '24px',
  border: '1px solid #E6EAF0',
  overflow: 'hidden',
}

const brandHeader = {
  backgroundImage: 'linear-gradient(135deg, #6C5CE7 0%, #4A8BFF 100%)',
  backgroundColor: '#4A8BFF',
  padding: '28px 24px',
  textAlign: 'center' as const,
}

const logo = {
  display: 'block',
  margin: '0 auto',
}

const content = {
  padding: '34px',
}

const h1 = {
  color: '#1A1F36',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 18px',
  textAlign: 'center' as const,
}

const greeting = {
  color: '#1A1F36',
  fontSize: '16px',
  margin: '0 0 8px',
}

const text = {
  color: '#6B7280',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 16px',
}

const amountBox = {
  backgroundColor: '#F9FBFE',
  borderRadius: '16px',
  padding: '24px',
  textAlign: 'center' as const,
  border: '1px solid #E6EAF0',
  margin: '24px 0',
}

const amountLabel = {
  color: '#6B7280',
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  margin: '0 0 4px',
}

const amountValue = {
  color: '#2ED39A',
  fontSize: '36px',
  fontWeight: '700',
  fontFamily: 'monospace',
  margin: '0',
}

const amountDate = {
  color: '#8A94A6',
  fontSize: '12px',
  margin: '8px 0 0',
}

const hr = {
  borderColor: '#E6EAF0',
  margin: '24px 0',
}

const summaryRow = {
  display: 'inline-block' as const,
  width: '33%',
  textAlign: 'center' as const,
}

const summaryLabel = {
  color: '#6B7280',
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  margin: '0 0 4px',
}

const summaryValue = {
  color: '#1A1F36',
  fontSize: '16px',
  fontWeight: '600',
  fontFamily: 'monospace',
  margin: '0',
}

const progressSection = {
  margin: '24px 0',
}

const completedBanner = {
  backgroundColor: '#EAFBF5',
  borderRadius: '12px',
  padding: '16px',
  border: '1px solid #BDF3DE',
  margin: '16px 0',
}

const completedText = {
  color: '#129B70',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
  textAlign: 'center' as const,
}

const button = {
  display: 'block',
  backgroundColor: '#4A8BFF',
  color: '#fff',
  padding: '12px 24px',
  borderRadius: '12px',
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '16px 0',
}

const footerNote = {
  color: '#8A94A6',
  fontSize: '11px',
  textAlign: 'center' as const,
  margin: '8px 0',
}

const senderLine = {
  color: '#6B7280',
  fontSize: '13px',
  textAlign: 'center' as const,
  margin: '0 0 6px',
}

const footer = {
  color: '#A2ABBA',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '0',
}
