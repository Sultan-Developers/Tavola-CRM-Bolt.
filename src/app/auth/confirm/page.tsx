import { redirect } from 'next/navigation'

export default async function AuthConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; type?: string; token_hash?: string }>
}) {
  const params = await searchParams
  const code = params.code
  const type = params.type
  const tokenHash = params.token_hash

  // Build callback URL with all params
  const callbackParams = new URLSearchParams()
  if (code) callbackParams.set('code', code)
  if (type) callbackParams.set('type', type)
  if (tokenHash) callbackParams.set('token_hash', tokenHash)

  redirect(`/auth/callback?${callbackParams.toString()}`)
}
