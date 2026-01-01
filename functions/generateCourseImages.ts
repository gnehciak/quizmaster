import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Use service role for admin-level access
        const courses = await base44.asServiceRole.entities.Course.list();
        
        // Find courses without images
        const coursesWithoutImage = courses.filter(c => !c.image_url || c.image_url.trim() === '');
        
        console.log(`Found ${coursesWithoutImage.length} courses without images.`);
        
        const updates = [];
        const errors = [];
        
        // Process each course
        for (const course of coursesWithoutImage) {
             try {
                console.log(`Generating image for: ${course.title}`);
                
                const prompt = `A modern, minimalist, educational cover image for a course titled "${course.title}". Category: ${course.category || 'Education'}. Vibrant colors, vector art style, clean design, 4k quality.`;
                
                const { url } = await base44.asServiceRole.integrations.Core.GenerateImage({
                    prompt: prompt
                });

                if (url) {
                    await base44.asServiceRole.entities.Course.update(course.id, {
                        image_url: url
                    });
                    updates.push({ title: course.title, url });
                    console.log(`Updated ${course.title}`);
                }
            } catch (err) {
                console.error(`Error for ${course.title}:`, err);
                errors.push({ title: course.title, error: err.message });
            }
        }
        
        return Response.json({
            message: "Image generation complete",
            processed: coursesWithoutImage.length,
            updates,
            errors
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});