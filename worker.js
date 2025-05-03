export default {
    async fetch(request, env) {
      const url = new URL(request.url);
      const path = url.pathname;
      
      try {
        // GET endpoint - retrieve the image
        if (request.method === 'GET' && path === '/image') {
          const token = url.searchParams.get('token');
          if (token !== env.VIEWTOKEN) {
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
        
        // Admin interface
        if (request.method === 'GET' && path === '/admin') {
          return new Response(getAdminHTML(), {
            headers: { 'Content-Type': 'text/html' }
          });
        }
        
        return new Response('Not found', { status: 404 });
      } catch (err) {
        return new Response(err.message, { status: 500 });
      }
    }
  };
  
  function getAdminHTML() {
    return `<!DOCTYPE html>
  <html>
  <head>
    <title>Image Admin</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
      .container { display: flex; flex-direction: column; gap: 20px; }
      .preview { max-width: 100%; max-height: 300px; border: 1px solid #ddd; }
      .upload-area { border: 2px dashed #ccc; padding: 20px; text-align: center; }
      .status { margin-top: 10px; padding: 10px; border-radius: 4px; }
      .success { background-color: #dff0d8; color: #3c763d; }
      .error { background-color: #f2dede; color: #a94442; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Image Admin</h1>
      
      <div>
        <h3>Current Image:</h3>
        <img id="currentImage" class="preview" src="" alt="Current Image">
      </div>
      
      <div class="upload-area">
        <h3>Upload New Image</h3>
        <input type="file" id="imageInput" accept="image/*">
        <button id="uploadBtn">Update Image</button>
        <div id="status" class="status"></div>
      </div>
    </div>
    
    <script>
      const token = new URLSearchParams(window.location.search).get('token');
      if (!token) {
        document.body.innerHTML = '<h1>Unauthorized</h1><p>Token parameter is required</p>';
      }
      
      // Load current image
      async function loadCurrentImage() {
        try {
          const response = await fetch(\`/image?token=\${token}\`);
          if (response.ok) {
            const imageData = await response.text();
            document.getElementById('currentImage').src = imageData;
          } else {
            document.getElementById('currentImage').alt = 'No image available';
          }
        } catch (err) {
          console.error('Error loading image:', err);
        }
      }
      
      // Handle image upload
      document.getElementById('uploadBtn').addEventListener('click', async () => {
        const fileInput = document.getElementById('imageInput');
        const statusEl = document.getElementById('status');
        
        if (!fileInput.files || fileInput.files.length === 0) {
          statusEl.textContent = 'Please select an image file';
          statusEl.className = 'status error';
          return;
        }
        
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = async (e) => {
          const imageData = e.target.result;
          
          try {
            const response = await fetch(\`/image?token=\${token}\`, {
              method: 'PUT',
              body: imageData
            });
            
            if (response.ok) {
              statusEl.textContent = 'Image updated successfully!';
              statusEl.className = 'status success';
              loadCurrentImage();
            } else {
              statusEl.textContent = \`Error: \${await response.text()}\`;
              statusEl.className = 'status error';
            }
          } catch (err) {
            statusEl.textContent = \`Error: \${err.message}\`;
            statusEl.className = 'status error';
          }
        };
        
        reader.readAsDataURL(file);
      });
      
      // Initialize
      loadCurrentImage();
    </script>
  </body>
  </html>`;
  }