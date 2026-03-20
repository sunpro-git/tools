import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { data: settingsData } = await supabase.from("catalog_settings").select("*");
    const settings: Record<string, string> = {};
    (settingsData || []).forEach((s: any) => { settings[s.key] = s.value; });

    if (settings.chatwork_notify_enabled !== "true") {
      return new Response(JSON.stringify({ success: true, message: "Notify disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const roomId = settings.chatwork_room_id;
    if (!roomId) {
      return new Response(JSON.stringify({ success: true, message: "No room_id configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const daysBefore = parseInt(settings.chatwork_notify_days_before || "7", 10);

    // Get target date in JST (UTC+9)
    const now = new Date();
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const targetDate = new Date(jstNow);
    targetDate.setDate(targetDate.getDate() + daysBefore);
    const targetStr = targetDate.toISOString().split("T")[0];

    // Find catalog items with next_reprint_date matching target
    const { data: items } = await supabase
      .from("catalog_items")
      .select("*")
      .eq("next_reprint_date", targetStr);

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No items to remind", date: targetStr }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get latest reprint for each item
    const itemIds = items.map((i: any) => i.id);
    const { data: reprints } = await supabase
      .from("catalog_reprints")
      .select("*")
      .in("catalog_item_id", itemIds)
      .order("reprint_date", { ascending: false });

    const latestReprints: Record<string, any> = {};
    (reprints || []).forEach((r: any) => {
      if (!latestReprints[r.catalog_item_id]) latestReprints[r.catalog_item_id] = r;
    });

    // Build and send messages
    let sentCount = 0;
    for (const item of items) {
      const latest = latestReprints[item.id];
      const costStr = latest?.cost ? `¥${Number(latest.cost).toLocaleString()}` : "—";

      const message = `[info][title]カタログ増刷リマインド[/title]` +
        `カタログ名: ${item.name}\n` +
        `ジャンル: ${item.genre}\n` +
        `増刷予定日: ${item.next_reprint_date}\n` +
        (latest ? `前回増刷: ${latest.reprint_date} / ${costStr}\n` : "") +
        (item.notes ? `備考: ${item.notes}\n` : "") +
        `\n${daysBefore}日後に増刷予定日を迎えます。準備をお願いします。[/info]`;

      const res = await fetch(`https://api.chatwork.com/v2/rooms/${roomId}/messages`, {
        method: "POST",
        headers: {
          "X-ChatWorkToken": chatworkToken,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `body=${encodeURIComponent(message)}`,
      });
      if (res.ok) sentCount++;
      await new Promise((r) => setTimeout(r, 200));
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount, total: items.length, date: targetStr }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
