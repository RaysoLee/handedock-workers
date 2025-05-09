
// 邮箱格式验证
export function validateEmail(email: string): boolean {
  // return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

// CORS 预检处理
export function handleOptions(request: Request): Response {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  return new Response(null, { headers });
}

export const corsHeaders = { // CORS 头部
  "Access-Control-Allow-Origin": "*",  // 允许所有来源（可以指定前端域名）
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
