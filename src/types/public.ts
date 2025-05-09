// public
export interface Env {
  GATSBY_SHOPIFY_STORE_URL: string; // Shopify 店铺 URL
  SHOPIFY_SHOP_PASSWORD: string; // Shopify 密码
  AUTH0_DOMAIN: string; // Auth0 域名
  AUTH0_CLIENT_ID: string; // Auth0 客户端 ID
  KLAVIYO_API_KEY: string; // Klaviyo API 密钥
  SUBSCRIBE_LIST_ID: string; // Klaviyo 订阅列表 ID
}

export interface Result<T> {
  status: number; // HTTP 状态码
  data: T; // 返回数据
  msg: string; // 返回消息
  [key: string]: any; // 其他可选字段
}

export const HttpStatusText = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  200: 'OK',
}