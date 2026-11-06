// Supabase Edge Function: paypal-webhook (see ../_shared/paypal.ts for the security model)
import { handleWebhook } from '../_shared/paypal.ts';
Deno.serve((req: Request) => handleWebhook(req, Deno.env.toObject(), fetch));
