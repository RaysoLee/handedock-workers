import { validateEmail } from "src/lib/utils";
import { Env, Result, HttpStatusText  } from "src/types/public";
import { ShopifyOrder, CustomerQueryResponse } from "src/types/shopify";

export default async function (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // 处理 CORS 预检请求
    if (request.method === "OPTIONS") {
      return handleOptions(request);
    }

    // 只允许 GET 请求
    if (request.method !== "GET") {
      const result: Result<null> = {
            status: 405,
            data: null,
            msg: HttpStatusText[405],
          } 
      return new Response(JSON.stringify(result), { status: 405, headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      const email = url.searchParams.get("email");
      if (!email || !validateEmail(email)) {
        const result: Result<null> = {
          status: 400,
          data: null,
          msg: "Invalid email parameter",
        } 
        return new Response(JSON.stringify(result), { status: 400, headers: corsHeaders });
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
        const result: Result<null> = {
          status: 404,
          data: null,
          msg: "Customer not found",
        }
        return new Response(JSON.stringify(result), { status: 404, headers: corsHeaders });
      }

      const customerId = customer.id.split("gid://shopify/Customer/")[1];  // 获取用户 ID
      console.log("Customer ID:", customerId);

      // 获取所有订单（含分页处理）
      const orders = await getAllShopifyOrders(env, customerId);
      const result: Result<any[]> = {
        status: 200,
        data: orders,
        msg: "Success",
      }
      
      return new Response(JSON.stringify(result), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS"
        }
      });

    } catch (err: any) {
      const result: Result<null> = {
        status: 500,
        data: null,
        msg: err.message,
      }
      return new Response(JSON.stringify(result), { status: 500, headers: corsHeaders });
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