import { validateEmail } from "src/lib/utils";
import { Env } from "src/types/public";
import { ShopifyOrder, CustomerQueryResponse } from "src/types/shopify";

export default async function (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // 处理 CORS 预检请求
    if (request.method === "OPTIONS") {
      return handleOptions(request);
    }

    // 只允许 GET 请求
    if (request.method !== "GET") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    try {
      const url = new URL(request.url);
      const email = url.searchParams.get("email");
      if (!email || !validateEmail(email)) {
        return new Response("Invalid email parameter", { status: 400 });
      }

      // Shopify Admin API 端点
      const shopifyEndpoint = `https://${env.GATSBY_SHOPIFY_STORE_URL}/admin/api/2024-04/graphql.json`;

      // 查询 Shopify 获取用户 ID
      const customerQuery = `
        query {
          customers(first: 1, query: "email:${email}") {
            edges {
              node {
                id
                email
              }
            }
          }
        }
      `;

      const customerResponse = await fetch(shopifyEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": env.SHOPIFY_SHOP_PASSWORD,
          ...corsHeaders
        },
        body: JSON.stringify({ query: customerQuery }),
      });

      const customerData: CustomerQueryResponse = await customerResponse.json();
      const customer = customerData?.data?.customers?.edges[0]?.node;

      if (!customer) {
        return new Response(JSON.stringify({ error: "Customer not found" }), { status: 404 });
      }

      const customerId = customer.id.split("gid://shopify/Customer/")[1];  // 获取用户 ID
      console.log("Customer ID:", customerId);

      // 获取所有订单（含分页处理）
      const orders = await getAllShopifyOrders(env, customerId);
      
      return new Response(JSON.stringify(orders), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS"
        }
      });

    } catch (err: any) {
      return new Response(err.message, { status: 500 });
    }
  }

// 获取所有订单（处理分页）
async function getAllShopifyOrders(env: Env, customerId: string): Promise<any[]> {
  let allOrders: any[] = [];
  let nextPageUrl: string | null = null;
  
  do {
    const apiUrl = nextPageUrl || 
      `https://${env.GATSBY_SHOPIFY_STORE_URL}/admin/api/2024-01/orders.json` +
      `?status=any&customer_id=${encodeURIComponent(customerId)}`;

    const response = await fetch(apiUrl, {
      headers: {
        "X-Shopify-Access-Token": env.SHOPIFY_SHOP_PASSWORD,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Shopify API Error: ${response.status}`);
    }

    const data: {orders: ShopifyOrder} = await response.json();
    allOrders = allOrders.concat(data.orders);
    
    // 处理分页链接
    const linkHeader = response.headers.get('Link');
    nextPageUrl = parseNextPageUrl(linkHeader);
  } while (nextPageUrl);
  
  console.log(allOrders);
  return allOrders;
}

// CORS 头部
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",  // 允许所有来源（可以指定前端域名）
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

// 处理分页链接
function parseNextPageUrl(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const matches = linkHeader.match(/<([^>]+)>; rel="next"/);
  return matches ? matches[1] : null;
}

// CORS 预检处理
function handleOptions(request: Request): Response {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  return new Response(null, { headers });
}