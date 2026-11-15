# igorrius.pp.ua — сторінка ФОП

Статична сторінка (`public/index.html`) + Cloudflare Worker (`src/worker.js`) для форми зворотного звʼязку.

- Захист від спаму: Cloudflare Turnstile + honeypot-поле + мінімальний час заповнення.
- Листи йдуть через Cloudflare Email Routing (`send_email` binding) з `site@igorrius.pp.ua`, Reply-To — адреса відправника.

## Одноразове налаштування в Cloudflare

1. **Email Routing** для `igorrius.pp.ua`: увімкнути, додати та підтвердити адресу-отримувача.
2. **Turnstile**: створити віджет для `igorrius.pp.ua`, взяти Site key і Secret key.
3. У `wrangler.jsonc` вписати `TURNSTILE_SITE_KEY`, `MAIL_TO` і `destination_address` (та сама адреса).
4. `npx wrangler secret put TURNSTILE_SECRET_KEY`

## Локально

`.dev.vars` (не в git) з тестовими ключами Turnstile:

```
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
MAIL_TO=dev@example.com
DEV=1
```

`npx wrangler dev` — листи зберігаються у `.wrangler/tmp/email/`.

## Деплой

`npx wrangler deploy`
