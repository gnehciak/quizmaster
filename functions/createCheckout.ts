import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { courseId } = await req.json();

    // Get course details
    const courses = await base44.entities.Course.filter({ id: courseId });
    const course = courses[0];

    if (!course) {
      return Response.json({ error: 'Course not found' }, { status: 404 });
    }

    if (!course.price) {
      return Response.json({ error: 'Course is not for sale' }, { status: 400 });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: course.title,
              description: course.description || 'Course access',
            },
            unit_amount: Math.round(course.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/?page=CourseDetail&id=${courseId}&payment=success`,
      cancel_url: `${req.headers.get('origin')}/?page=CourseDetail&id=${courseId}&payment=cancelled`,
      metadata: {
        courseId: courseId,
        userEmail: user.email,
      },
    });

    return Response.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});