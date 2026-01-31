import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quizTitle, score, total, percentage, questionBreakdown } = await req.json();

    // Build the email body with results
    let emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Quiz Completed! 🎉</h2>
        <p>Hi ${user.full_name || 'there'},</p>
        <p>You've completed the quiz: <strong>${quizTitle}</strong></p>
        
        <div style="background-color: #F9FAFB; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1F2937;">Your Results</h3>
          <div style="font-size: 32px; font-weight: bold; color: ${percentage >= 70 ? '#10B981' : percentage >= 50 ? '#F59E0B' : '#EF4444'};">
            ${percentage}%
          </div>
          <p style="color: #6B7280; margin-top: 10px;">
            Score: ${score} / ${total}
          </p>
        </div>
    `;

    // Add breakdown if provided
    if (questionBreakdown && questionBreakdown.length > 0) {
      emailBody += `
        <h3 style="color: #1F2937;">Question Breakdown</h3>
        <div style="margin-bottom: 20px;">
      `;

      questionBreakdown.forEach((item, index) => {
        const icon = item.correct ? '✓' : '✗';
        const color = item.correct ? '#10B981' : '#EF4444';
        emailBody += `
          <div style="display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #E5E7EB;">
            <span style="color: ${color}; font-weight: bold; margin-right: 8px; font-size: 18px;">${icon}</span>
            <span style="color: #4B5563;">Question ${index + 1}</span>
            ${item.points ? `<span style="margin-left: auto; color: #6B7280; font-size: 14px;">${item.points} pts</span>` : ''}
          </div>
        `;
      });

      emailBody += `</div>`;
    }

    emailBody += `
        <p style="margin-top: 30px;">Keep up the great work!</p>
        <p style="color: #6B7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
          This is an automated email. Please do not reply.
        </p>
      </div>
    `;

    // Send the email
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'no-reply@app.writingcollege.com.au',
      to: user.email,
      subject: `Quiz Complete: ${quizTitle} - ${percentage}%`,
      body: emailBody
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error sending quiz completion email:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});