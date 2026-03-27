import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  
  if (!signature) {
    return Response.json({ error: 'No signature' }, { status: 400 });
  }

  let event;
  
  try {
    const body = await req.text();
    
    // Verify webhook signature
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return Response.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    try {
      // Initialize base44 client with service role after signature validation
      const base44 = createClientFromRequest(req);
      
      const courseId = session.metadata.courseId;
      const userEmail = session.metadata.userEmail;
      const paymentIntentId = session.payment_intent;

      // Check if access already exists
      const existingAccess = await base44.asServiceRole.entities.CourseAccess.filter({
        course_id: courseId,
        user_email: userEmail
      });

      if (existingAccess.length === 0) {
        // Grant course access
        await base44.asServiceRole.entities.CourseAccess.create({
          user_email: userEmail,
          course_id: courseId,
          unlock_method: 'purchase',
          stripe_payment_intent_id: paymentIntentId
        });
      }

      return Response.json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  return Response.json({ received: true });
});