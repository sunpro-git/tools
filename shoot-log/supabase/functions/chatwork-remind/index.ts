import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Template tag rendering (duplicated from frontend for server-side use)
function renderTemplate(template: string, prop: any, staffs: any[], extraCtx: Record<string, string> = {}): string {
  const fd = (d: string) => d ? d.split("T")[0] : "";
  const mentionNames = [...(prop.notificationStaff || []), ...(prop.youtubeStaff || []), ...(prop.photoStaff || []), ...(prop.instaLiveStaff || [])];
  if (prop.requester) mentionNames.push(prop.requester);
  const mentionStr = [...new Set(mentionNames)].map((n: string) => {
    const s = staffs.find((st: any) => st.name === n);
    return s && s.chatwork_account_id ? `[To:${s.chatwork_account_id}]${s.name}さん` : null;
  }).filter(Boolean).join(" ");
  const map: Record<string, string> = {
    "{物件名}": ((prop.customerName || prop.name || "") as string).replace(/[\s\u3000]+/g, ""),
    "{住所}": prop.address || "", "{種別}": prop.category || "",
    "{営業担当}": prop.salesRep || "", "{IC担当}": prop.icRep || "", "{工務担当}": prop.constructionRep || "",
    "{設営日}": fd(prop.setupDate), "{撤収日}": fd(prop.teardownDate), "{引渡日}": fd(prop.handoverDate),
    "{見学会日}": (prop.openHouseDates || []).filter((d: string) => d).map((d: string) => d.split("T")[0]).join(", "),
    "{YouTube日}": fd(prop.youtubeDate), "{スチール日}": fd(prop.photoDate), "{インスタライブ日}": fd(prop.instaLiveDate),
    "{インスタ通常日}": fd(prop.instaRegularDate), "{インスタ宣伝日}": fd(prop.instaPromoDate), "{その他日}": fd(prop.otherDate),
    "{撮影種類}": (prop.shootingTypes || []).join(", "), "{家具設営}": prop.furnitureSetup || "", "{依頼者}": prop.requester || "",
    "{SystemID}": prop.systemId || "", "{駐車場}": prop.parkingInfo || "", "{撮影ポイント}": prop.shootingPoints || "",
    "{立ち合い}": prop.witnessStaff || "", "{施主在宅}": prop.ownerPresence || "", "{撮影備考}": prop.shootingNotes || "",
    "{メンション}": mentionStr,
    "{撮影日}": extraCtx.shootingDate || "", "{撮影タイプ}": extraCtx.shootingType || "", "{撮影担当}": extraCtx.shootingStaff || "",
  };
  return template.replace(/\{[^}]+\}/g, (m) => map[m] !== undefined ? map[m] : m);
}

const DEFAULT_REMIND_TEMPLATE = `{メンション}\n[info][title]シューログ 明日の撮影リマインド[/title]\n物件名: {物件名}\n撮影タイプ: {撮影タイプ}\n撮影日: {撮影日}\n住所: {住所}\n担当: {撮影担当}\n駐車場: {駐車場}\n[/info]`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const chatworkToken = Deno.env.get("CHATWORK_API_TOKEN");
    if (!chatworkToken) throw new Error("CHATWORK_API_TOKEN not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load settings
    const { data: settingsData } = await supabase.from("app_settings").select("*");
    const settings: Record<string, string> = {};
    (settingsData || []).forEach((s: any) => { settings[s.key] = s.value; });

    if (settings.chatwork_notify_on_remind !== "true") {
      return new Response(JSON.stringify({ success: true, message: "Remind disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const roomId = settings.chatwork_room_id;
    if (!roomId) {
      return new Response(JSON.stringify({ success: true, message: "No room_id configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get tomorrow's date in JST (UTC+9)
    const now = new Date();
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const tomorrow = new Date(jstNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // Load data
    const { data: properties } = await supabase.from("properties").select("*");
    const { data: staffs } = await supabase.from("staffs").select("*");

    // Date fields to check
    const dateFields = [
      { field: "setupDate", type: "設営", staffField: null as string | null },
      { field: "youtubeDate", type: "YouTube撮影", staffField: "youtubeStaff" },
      { field: "photoDate", type: "スチール撮影", staffField: "photoStaff" },
      { field: "instaLiveDate", type: "インスタライブ", staffField: "instaLiveStaff" },
      { field: "instaRegularDate", type: "インスタ通常投稿", staffField: "instaRegularStaff" },
      { field: "instaPromoDate", type: "インスタ宣伝", staffField: "instaPromoStaff" },
      { field: "otherDate", type: "その他撮影", staffField: "otherStaff" },
    ];

    const template = settings.chatwork_template_remind || DEFAULT_REMIND_TEMPLATE;
    const messages: string[] = [];

    for (const prop of (properties || [])) {
      for (const df of dateFields) {
        const dateVal = (prop as any)[df.field];
        if (!dateVal) continue;
        const dateOnly = dateVal.split("T")[0];
        if (dateOnly !== tomorrowStr) continue;

        const staffNames = df.staffField ? ((prop as any)[df.staffField] || []) : [];
        const message = renderTemplate(template, prop, staffs || [], {
          shootingDate: dateOnly,
          shootingType: df.type,
          shootingStaff: staffNames.join(", "),
        });
        messages.push(message);
      }
    }

    // Send messages with rate limiting
    let sentCount = 0;
    for (const message of messages) {
      const res = await fetch(`https://api.chatwork.com/v2/rooms/${roomId}/messages`, {
        method: "POST",
        headers: {
          "X-ChatWorkToken": chatworkToken,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `body=${encodeURIComponent(message)}`,
      });
      if (res.ok) sentCount++;
      await new Promise((r) => setTimeout(r, 200)); // rate limit guard
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount, total: messages.length, date: tomorrowStr }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
