export default {
  async fetch(request, env) {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY,
        image_data TEXT NOT NULL
      )
    `).run();
    
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // GET endpoint - retrieve the image
      if (request.method === 'GET' && path === '/image') {
        const token = url.searchParams.get('token');
        if (token !== env.VIEWTOKEN && token !== env.ADMINTOKEN) {
          return new Response('Unauthorized', { status: 401 });
        }
        
        // Get the image from database
        const result = await env.DB.prepare(
          'SELECT image_data FROM images WHERE id = 1'
        ).first();
        
        if (!result || !result.image_data) {
          return new Response('Image not found', { status: 404 });
        }
        
        return new Response(result.image_data, {
          headers: {
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      // PUT endpoint - update the image
      if (request.method === 'PUT' && path === '/image') {
        const token = url.searchParams.get('token');
        if (token !== env.ADMINTOKEN) {
          return new Response('Unauthorized', { status: 401 });
        }
        
        const imageData = await request.text();
        
        if (!imageData.startsWith('data:image')) {
          return new Response('Invalid image format', { status: 400 });
        }
        
        // Update or insert the image
        await env.DB.prepare(
          'INSERT INTO images (id, image_data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET image_data = ?'
        ).bind(imageData, imageData).run();
        
        return new Response('Image updated successfully');
      }
      
      // Serve admin.html
      if (request.method === 'GET' && path === '/admin') {
        return fetch(new URL('admin.html', import.meta.url));
      }
      
      return new Response('Not found', { status: 404 });
    } catch (err) {
      return new Response(err.message, { status: 500 });
    }
  }
};