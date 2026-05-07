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
  Section,
  Text,
} from '@react-email/components'

interface AdminStripePaymentEmailProps {
  clientName: string
  concept: string
  amount: number
  totalCharged: number
  feeAmount: number
  orderId: string
  appUrl: string
}

function fmt(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)
}

export function AdminStripePaymentEmail({
  clientName,
  concept,
  amount,
  totalCharged,
  feeAmount,
  orderId,
  appUrl,
}: AdminStripePaymentEmailProps) {
  const normalizedAppUrl = appUrl.replace(/\/$/, '')
  const orderUrl = `${normalizedAppUrl}/admin/orders/${orderId}`
  const logoUrl = `${normalizedAppUrl}/otla-white.png`

  return (
    <Html>
      <Head />
      <Preview>OTLA · Pago Stripe recibido - {concept}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={brandHeader}>
            <Img src={logoUrl} alt="OTLA" width="150" style={logo} />
          </Section>

          <Section style={content}>
            <Text style={eyebrow}>Pago recibido</Text>
            <Heading style={h1}>{fmt(amount)}</Heading>
            <Text style={text}>{clientName} pagó por Stripe para la orden <strong>{concept}</strong>.</Text>

            <Section style={amountBox}>
              <Text style={amountLabel}>Cargo total</Text>
              <Text style={amountValue}>{fmt(totalCharged)}</Text>
              <Text style={amountDate}>Comisión: {fmt(feeAmount)}</Text>
            </Section>

            <Hr style={hr} />
            <Link href={orderUrl} style={button}>Ver orden</Link>
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
  letterSpacing: '0.16em',
  textTransform: 'uppercase' as const,
  margin: '0 0 10px',
}

const h1 = {
  color: '#1A1F36',
  fontSize: '34px',
  lineHeight: '1.15',
  margin: '0 0 16px',
}

const text = {
  color: '#4B5565',
  fontSize: '15px',
  lineHeight: '1.7',
}

const amountBox = {
  backgroundColor: '#F8FAFF',
  border: '1px solid #E6EAF0',
  borderRadius: '18px',
  padding: '20px',
  margin: '22px 0',
}

const amountLabel = {
  color: '#6B7280',
  fontSize: '12px',
  fontWeight: '700',
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  margin: '0',
}

const amountValue = {
  color: '#2ED39A',
  fontSize: '28px',
  fontWeight: '800',
  margin: '8px 0 0',
}

const amountDate = {
  color: '#6B7280',
  fontSize: '13px',
  margin: '8px 0 0',
}

const hr = {
  borderColor: '#E6EAF0',
  margin: '24px 0',
}

const button = {
  display: 'block',
  backgroundColor: '#6C5CE7',
  color: '#FFFFFF',
  textDecoration: 'none',
  textAlign: 'center' as const,
  padding: '14px 18px',
  borderRadius: '12px',
  fontWeight: '700',
}

const footer = {
  color: '#8A94A6',
  fontSize: '12px',
  textAlign: 'center' as const,
  marginTop: '28px',
}
