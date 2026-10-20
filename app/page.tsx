import type { Metadata } from 'next'
import LoginPage from './login/page'

export const metadata: Metadata = { title: 'Entrar · OTLA', description: 'Accede a tu espacio de contactos, agenda, comunicación y pagos.' }

export default function Home() {
  return <LoginPage />
}
