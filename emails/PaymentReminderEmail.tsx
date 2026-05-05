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

interface PaymentReminderEmailProps {
  clientName: string
  concept: string
  paidAmount: number
  totalAmount: number
  dueDate?: string | null
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
  }).format(new Date(`${date}T12:00:00`))
}

export function PaymentReminderEmail({
  clientName,
  concept,
  paidAmount,
  totalAmount,
  dueDate,
  token,
  appUrl,
  senderName,
}: PaymentReminderEmailProps) {
  const remaining = Math.max(0, totalAmount - paidAmount)
  const percent = totalAmount > 0 ? Math.min(100, Math.round((paidAmount / totalAmount) * 100)) : 0
  const normalizedAppUrl = appUrl.replace(/\/$/, '')
  const statusLink = `${normalizedAppUrl}/p/${token}`
  const logoUrl = `${normalizedAppUrl}/otla-white.png`

  return (
    <Html>
      <Head />
      <Preview>OTLA · Recordatorio de pago - {concept}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={brandHeader}>
            <Img src={logoUrl} alt="OTLA" width="150" style={logo} />
          </Section>

          <Section style={content}>
            <Text style={eyebrow}>Recordatorio de pago</Text>
            <Heading style={h1}>{concept}</Heading>
            <Text style={greeting}>Hola {clientName},</Text>
            <Text style={text}>
              Te compartimos el estado actualizado de tu orden para que puedas revisar el saldo pendiente.
            </Text>

            <Section style={amountBox}>
              <Text style={amountLabel}>Saldo pendiente</Text>
              <Text style={amountValue}>{fmt(remaining)}</Text>
              {dueDate && <Text style={amountDate}>Fecha límite: {fmtDate(dueDate)}</Text>}
            </Section>

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
                <Text style={summaryLabel}>Pendiente</Text>
                <Text style={{ ...summaryValue, color: remaining > 0 ? '#F4B740' : '#2ED39A' }}>
                  {remaining > 0 ? fmt(remaining) : 'Liquidado'}
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

            <Hr style={hr} />

            <Text style={text}>Puedes revisar el detalle completo y el historial de abonos aquí:</Text>
            <Link href={statusLink} style={button}>
              Ver detalle de pago
            </Link>

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

const eyebrow = {
  color: '#6C5CE7',
  fontSize: '12px',
  fontWeight: '700',
  letterSpacing: '0.08em',
  margin: '0 0 8px',
  textAlign: 'center' as const,
  textTransform: 'uppercase' as const,
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
  color: '#F4B740',
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

const hr = {
  borderColor: '#E6EAF0',
  margin: '24px 0',
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
