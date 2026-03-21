import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    return Response.json({ ok: true, user: user?.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});