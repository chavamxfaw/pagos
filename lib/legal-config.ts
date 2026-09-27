/** Public contact identity explicitly provided by the operator. */
export function legalIdentity(env: Record<string, string | undefined> = process.env) {
  const address = env.OTLA_LEGAL_ADDRESS?.trim() || ''
  return { name: 'Salvador Cervantes Tijerina', address, email: 'buenas@chavacervantes.dev', ready: Boolean(address) }
}
