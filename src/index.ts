// Cloudflare Worker entry point
// 处理请求并分发到不同的模块

// shopify 订单处理
import shopifyOrders from 'src/shopify/orders'
// import subscribe from 'src/auth0/subscribe'

import { Env } from 'src/types/public'

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const { pathname } = url
    // 路由分发
    switch (pathname) {
      case '/health':
        return new Response('OK')
      case '/shopify/orders':
        return shopifyOrders(request, env, ctx)
      // case '/auth0/subscribe':
      //   return handleSubscribe(request, env, ctx)
      default:
        // 未知路径
        return new Response('Not Found', { status: 404 })
    }
  }
}