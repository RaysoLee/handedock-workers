import { Env } from "src/types/public";

export default async function (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {

  const { email, code } = await request.json() as { email: string, code: string }
  if (!email || !code) {
    return new Response('Missing email or code', { status: 400 })
  }
  const verifyResp = await fetch(`https://${env.AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'http://auth0.com/oauth/grant-type/passwordless/otp',
      client_id: env.AUTH0_CLIENT_ID,
      username: email,
      otp: code,
      realm: 'email',
      scope: 'openid profile email'
    })
  })

  const result = await verifyResp.json() as { error_description?: string }

  if (!verifyResp.ok) {
    return new Response(result.error_description || 'Verification failed', { status: 401 })
  }

  // 保存用户邮箱，比如发送到 webhook
  // await fetch(env.SUBSCRIBE_WEBHOOK_URL, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email })
  // })

  return new Response('Subscribed successfully')
}