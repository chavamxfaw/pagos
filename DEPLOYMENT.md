# Deployment

## Supabase Cloud

Project name: `pagos`

Project ref: `vxxanvvpesqerokpsvsh`

Project URL:

```env
NEXT_PUBLIC_SUPABASE_URL=https://vxxanvvpesqerokpsvsh.supabase.co
```

Recommended public key:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_2ou4V0VMkMEM-QghAd3GNw_eG8faAtI
```

Use the Supabase Dashboard value for the private server key:

```env
SUPABASE_SERVICE_ROLE_KEY=
```

## Vercel Environment Variables

Set these in Vercel before deploying:

```env
NEXT_PUBLIC_SUPABASE_URL=https://vxxanvvpesqerokpsvsh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_2ou4V0VMkMEM-QghAd3GNw_eG8faAtI
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
NEXT_PUBLIC_APP_URL=
```

After Vercel creates the first deployment URL, update `NEXT_PUBLIC_APP_URL` to that URL or the final custom domain.

## Supabase Auth URLs

In Supabase Dashboard, configure:

```text
Site URL: https://your-vercel-domain
Redirect URL: https://your-vercel-domain/api/auth/callback
```

## Pre-Deploy Checks

Run:

```bash
npm run lint
npm run build
```
