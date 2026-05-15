# Deploy da Edge Function — notify-checklist-nc

## 1. Pré-requisitos

Instale o Supabase CLI:
```bash
npm install -g supabase
```

Faça login:
```bash
supabase login
```

## 2. Configurar o project_id

Abra `supabase/config.toml` e preencha o `project_id` com o ID do seu projeto.
Encontre em: **Supabase Dashboard → Settings → General → Reference ID**

## 3. Deploy da função

Na raiz do repositório (`c:\Frota`):

```bash
supabase functions deploy notify-checklist-nc --project-ref SEU_PROJECT_ID
```

## 4. Configurar variáveis de ambiente

No **Supabase Dashboard → Edge Functions → notify-checklist-nc → Secrets**:

| Variável             | Valor                                      |
|----------------------|--------------------------------------------|
| `WHATSAPP_API_URL`   | URL base da sua API de WhatsApp            |
| `WHATSAPP_API_TOKEN` | Token de autenticação                      |
| `WHATSAPP_API_TYPE`  | `zapi` \| `evolution` \| `custom`          |
| `WHATSAPP_INSTANCE`  | Nome da instância (apenas Evolution API)   |
| `WEBHOOK_SECRET`     | Um segredo qualquer para validar chamadas  |

Ou via CLI:
```bash
supabase secrets set WHATSAPP_API_URL="https://..." --project-ref SEU_PROJECT_ID
supabase secrets set WHATSAPP_API_TOKEN="seu-token" --project-ref SEU_PROJECT_ID
supabase secrets set WHATSAPP_API_TYPE="zapi" --project-ref SEU_PROJECT_ID
supabase secrets set WEBHOOK_SECRET="um-segredo-forte" --project-ref SEU_PROJECT_ID
```

## 5. Configurar o Database Webhook

No **Supabase Dashboard → Database → Webhooks → Create Webhook**:

| Campo       | Valor                                                              |
|-------------|--------------------------------------------------------------------|
| Name        | `notify-checklist-nc`                                              |
| Table       | `checklists`                                                       |
| Events      | ✅ Insert                                                          |
| Type        | Edge Function                                                      |
| Function    | `notify-checklist-nc`                                              |
| HTTP Header | `Authorization: Bearer SEU_WEBHOOK_SECRET`                         |

> O webhook só dispara em **INSERT** — não em UPDATE — para evitar notificações duplicadas.

## 6. Testar

Envie um checklist com NC pelo app e verifique os logs:

```bash
supabase functions logs notify-checklist-nc --project-ref SEU_PROJECT_ID
```

Ou no Dashboard: **Edge Functions → notify-checklist-nc → Logs**

## Estrutura da mensagem enviada

```
🚫 VEÍCULO IMPEDIDO DE OPERAR   (ou ⚠ CHECKLIST COM NÃO CONFORMIDADE)

Olá, NOME DO SUPERVISOR!
Um checklist foi concluído com X item(s) NC.

📋 Dados do checklist:
• Operador: João Silva (Mat. 00123)
• Veículo: POY2583 — PDT350
• Localidade: PDT
• Data: 14/05/2026

🚫 2 item(s) impeditivo(s) — o veículo está IMPEDIDO de ser operado...

Itens com NC:
• sky-02: Pneu traseiro com desgaste excessivo
• sky-16: Freio de estacionamento inoperante

Por favor, verifique e tome as providências necessárias.
```

## Adicionar nova API de WhatsApp

Se usar uma API diferente de Z-API ou Evolution, configure `WHATSAPP_API_TYPE=custom`
e edite o bloco `else` da função `enviarWhatsapp` em `index.ts` com o formato correto.
