type Template = { contentSid: string; variables: Record<string, string> }

// Old approved templates keep their exact variable contract. A new sender-aware
// template must be separately approved and explicitly configured by the owner.
export function withSenderTemplate(
  legacySid: string | undefined,
  senderSid: string | undefined,
  variables: Record<string, string>,
  senderName: string,
  senderVariable: string,
): { template: Template | null; identityWarning: string | null } {
  if (senderSid) return {
    template: { contentSid: senderSid, variables: { ...variables, [senderVariable]: senderName } },
    identityWarning: null,
  }
  return {
    template: legacySid ? { contentSid: legacySid, variables } : null,
    identityWarning: legacySid
      ? 'La plantilla anterior no incluye quién envía. Se conserva por compatibilidad; configura y aprueba la versión con remitente para incluir tu nombre.'
      : null,
  }
}
