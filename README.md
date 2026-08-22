# AMBITAT

App de identificación y cuidado de plantas.

## Antes de desplegar

1. Consigue una API key en https://console.anthropic.com (Settings → API Keys).
2. En Vercel, ve a tu proyecto → Settings → Environment Variables y agrega:
   - `ANTHROPIC_API_KEY` = tu key

## Desarrollo local (opcional)

```
npm install
cp .env.local.example .env.local   # y pega tu key ahí
npm run dev
```
