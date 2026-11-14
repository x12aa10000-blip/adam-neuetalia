// Supabase Edge Function: dhl-label (see ../_shared/dhl.ts for the security model)
import { handleLabel } from '../_shared/dhl.ts';
Deno.serve((req: Request) => handleLabel(req, Deno.env.toObject(), fetch));
