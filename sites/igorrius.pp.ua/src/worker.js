import { EmailMessage } from "cloudflare:email";

const MIN_FILL_MS = 3000; // faster than this looks like a bot
const LIMITS = { name: 100, email: 200, subject: 150, message: 5000 };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const isLocal = env.DEV === "1"; // set in .dev.vars; wrangler dev rewrites the host to the route
    if (!isLocal && (url.hostname.startsWith("www.") || url.protocol === "http:")) {
      url.hostname = url.hostname.replace(/^www\./, "");
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === "/api/contact") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      return handleContact(request, env);
    }

    const res = await env.ASSETS.fetch(request);
    const type = res.headers.get("content-type") || "";
    if (!type.includes("text/html")) return res;

    // Inject the public Turnstile site key into the page.
    const html = (await res.text()).replaceAll("__TURNSTILE_SITE_KEY__", env.TURNSTILE_SITE_KEY || "");
    const headers = new Headers(res.headers);
    headers.delete("content-length");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return new Response(html, { status: res.status, headers });
  },
};

async function handleContact(request, env) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: "Некоректний запит." }, 400);
  }

  const field = (k) => (typeof data[k] === "string" ? data[k].trim() : "");
  const name = field("name");
  const email = field("email");
  const subject = field("subject");
  const message = field("message");

  // Honeypot: real users never see this field. Pretend success so bots learn nothing.
  if (field("website")) return json({ ok: true });

  const ts = Number(data.ts);
  if (!ts || Date.now() - ts < MIN_FILL_MS) return json({ ok: true });

  if (!name || !email || message.length < 10) {
    return json({ error: "Заповніть імʼя, email і повідомлення (від 10 символів)." }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Перевірте email." }, 400);
  }
  for (const [k, max] of Object.entries(LIMITS)) {
    if (field(k).length > max) return json({ error: "Задовге значення в полі." }, 400);
  }

  const token = field("cf-turnstile-response");
  const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY || "",
      response: token,
      remoteip: request.headers.get("CF-Connecting-IP") || "",
    }),
  }).then((r) => r.json()).catch(() => ({ success: false }));
  if (!verify.success) {
    return json({ error: "Перевірка «я не робот» не пройдена. Оновіть сторінку і спробуйте ще раз." }, 403);
  }

  const from = env.MAIL_FROM;
  const to = env.MAIL_TO;
  const ip = request.headers.get("CF-Connecting-IP") || "?";
  const country = request.cf?.country || "?";
  const text =
    `Нове повідомлення з igorrius.pp.ua\n\n` +
    `Імʼя: ${name}\nEmail: ${email}\nТема: ${subject || "—"}\n\n${message}\n\n` +
    `---\nIP: ${ip} (${country})\n${new Date().toISOString()}\n`;

  const raw = buildMime({
    from: `Сайт ФОП <${from}>`,
    to,
    replyTo: email,
    subject: `[igorrius.pp.ua] ${subject || "Повідомлення від " + name}`,
    text,
  });

  try {
    await env.SEND_EMAIL.send(new EmailMessage(from, to, raw));
  } catch (e) {
    console.error("send_email failed", e);
    return json({ error: "Не вдалося надіслати. Спробуйте пізніше." }, 502);
  }
  return json({ ok: true });
}

function buildMime({ from, to, replyTo, subject, text }) {
  const enc = (s) => `=?UTF-8?B?${b64(s)}?=`;
  const encAddr = (s) => s.replace(/^(.*?)\s*<(.+)>$/, (_, n, a) => (n ? `${enc(n)} <${a}>` : `<${a}>`));
  const domain = to.split("@")[1] || "igorrius.pp.ua";
  const body = b64(text).replace(/.{76}/g, "$&\r\n");
  return [
    `From: ${encAddr(from)}`,
    `To: <${to}>`,
    `Reply-To: <${replyTo.replace(/[\r\n<>]/g, "")}>`,
    `Subject: ${enc(subject.replace(/[\r\n]/g, " "))}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    body,
  ].join("\r\n");
}

function b64(s) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
