import { Env } from "src/types/public";
import { validateEmail, handleOptions } from "@/lib/utils";

export default async function (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method === "OPTIONS") {
    return handleOptions(request);
  }
  // 只允许 post 请求
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const { email } = await request.json() as { email: string }
  
  if(!email || !validateEmail(email)) {
    return new Response("Invalid email parameter", { status: 400 });
  }

  const auth0Domain = env.AUTH0_DOMAIN;
  const auth0ClientId = env.AUTH0_CLIENT_ID;
  const auth0Url = `https://${auth0Domain}/passwordless/start`;

  const resp = await fetch(auth0Url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: auth0ClientId,
      connection: 'email',
      send: 'code',
      email
    })
  })

  if (!resp.ok) {
    const error = await resp.text()
    return new Response(error, { status: 500 })
  }

  return new Response('Code sent')
}