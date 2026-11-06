// Supabase Edge Function: paypal-create-order (see ../_shared/paypal.ts for the security model)
import { handleCreate } from '../_shared/paypal.ts';
Deno.serve((req: Request) => handleCreate(req, Deno.env.toObject(), fetch));
