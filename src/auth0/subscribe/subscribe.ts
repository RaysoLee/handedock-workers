import { Env, Result, HttpStatusText } from "src/types/public";
import { validateEmail, handleOptions, corsHeaders } from "@/lib/utils";

export default async function (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method === "OPTIONS") {
    return handleOptions(request);
  }

  if (request.method !== "POST") {
    const result: Result<null> = {
      status: 405,
      data: null,
      msg: HttpStatusText[405],
    } 
    return new Response(JSON.stringify(result), { status: 405, headers: corsHeaders });
  }

  // 读取请求体
  const requestBody = await request.clone().json() as { email: string };
  const { email } = requestBody;

  if (!email || !validateEmail(email)) {
    const result: Result<null> = {
      status: 400,
      data: null,
      msg: "Invalid email parameter",
    }
    return new Response(JSON.stringify(result), { status: 400, headers: corsHeaders });
  }

  // Klaviyo Headers
  const klaviyoHeaders = {
    Authorization: `Klaviyo-API-Key ${env.KLAVIYO_API_KEY}`,
    accept: 'application/vnd.api+json',
    revision: '2025-04-15',
    'content-type': 'application/vnd.api+json',
  };
  // return createProfileAndAddToList(email, env.SUBSCRIBE_LIST_ID, klaviyoHeaders);

  // Step 1: 查询 Profile（GET /api/profiles?filter=email equals "xxx"）
  let profileId: string | null = await getPrefileId(email, klaviyoHeaders);

  // Step 2: 如果没有找到 Profile，就创建
  if (!profileId) {
    const createRes = await createProfile(email, klaviyoHeaders);
    if (createRes instanceof Response) {
      return createRes;  // 如果创建失败，直接返回响应
    }
    profileId = createRes as string;  // 获取创建的 Profile ID
  }

  // Step 3: 将 Profile 添加到列表
  return addProfileToList(profileId, env.SUBSCRIBE_LIST_ID, klaviyoHeaders);
}
// getPrefileId 函数
const getPrefileId = async (email: string, headers: any): Promise<string | null> => {
  let profileId: string | null = null;
  const filterStr = `equals(email,'${email}')`;
  const searchRes = await fetch(
    `https://a.klaviyo.com/api/profiles?filter=${encodeURIComponent(filterStr)}`,
    { method: "GET", headers }
  );
  if (searchRes.ok) {
    const profileRes: any = await searchRes.json();
    const existing = profileRes?.data?.[0];
    if (existing?.id) {
      profileId = existing.id;
    }
  }
  return profileId;
}
// createProfile 函数
const createProfile = async (email: string, headers: any): Promise<string | null | Response> => {
  const createRes = await fetch("https://a.klaviyo.com/api/profiles", {
    method: "POST",
    headers: headers,
    body: JSON.stringify({
      data: {
        type: "profile",
        attributes: {
          email,
        },
      },
    }),
  });
  // 检查响应状态
  if (!createRes.ok) {
    const errorText = await createRes.text();
    const result: Result<null> = {
      status: 500,
      data: null,
      msg: "Failed to create profile",
      detail: errorText
    }
    return new Response(
      JSON.stringify(result),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const profile: any = await createRes.json();
  return profile?.data?.id;
}
// addProfileToList 函数
const addProfileToList = async (profileId: string, listId: string, headers: any): Promise<Response> => {
  const addRes = await fetch(`https://a.klaviyo.com/api/lists/${listId}/relationships/profiles`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      data: [
        {
          type: "profile",  // 定义数据类型为 profile
          id: profileId,  // 使用获取到的 profileId
        }
      ]
    }),
  });

  if (!addRes.ok) {
    const errorText = await addRes.text();
    const result: Result<null> = {
      status: 500,
      data: null,
      msg: "Failed to add profile to list",
      detail: errorText
    }
    return new Response(
      JSON.stringify(result),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  const result: Result<string> = {
    status: 200,
    data: profileId,
    msg: "Subscribed successfully",
  }
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// 直接创建 Profile 并加入list
const createProfileAndAddToList = async (email: string, listId: string, headers: any): Promise<Response> => {
  const addRes = await fetch("https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/", {
    method: "POST",
    headers,
    body: JSON.stringify({
      data: {
        type: "profile-subscription-bulk-create-job",
        attributes: {
          list_id: listId,
          custom_source: "WebsiteSignupForm",
          profiles: {
            data: [
              {
                type: "profile",
                attributes: {
                  email: email,
                  subscriptions: [
                    {
                      channel: "email",
                      status: "SUBSCRIBED"
                    }
                  ]
                }
              }
            ]
          }
        }
      }
    })
  });
  
  if (!addRes.ok) {
    const errorText = await addRes.text();
    const result: Result<null> = {
      status: 500,
      data: null,
      msg: "Failed to add profile to list",
      detail: errorText
    }
    return new Response(
      JSON.stringify(result),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  const result: Result<string> = {
    status: 200,
    data: email,
    msg: "Subscribed successfully",
  }
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}