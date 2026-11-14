// Supabase Edge Function: paypal-capture-order (see ../_shared/paypal.ts for the security model)
import { handleCapture } from '../_shared/paypal.ts';
Deno.serve((req: Request) => handleCapture(req, Deno.env.toObject(), fetch));
