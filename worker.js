export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const clientIP = request.headers.get('CF-Connecting-IP') || '';
    const clientOrg = request.cf?.asOrganization || '';
    const inPKU = isPKUIP(clientIP);

    try {
      // GET endpoint - retrieve the image
      if (request.method === 'GET' && path === '/inpku') {
        return new Response(JSON.stringify({
          ip: clientIP,
          org: clientOrg,
          pku: inPKU
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS images (
          id INTEGER PRIMARY KEY,
          image_data TEXT NOT NULL
        )
      `).run();
      
      if (request.method === 'GET' && path === '/image') {
        const token = url.searchParams.get('token');
        if (!inPKU && token !== env.VIEWTOKEN && token !== env.ADMINTOKEN) {
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
// 允许的 CIDR 范围
const pkuCIDRv4 = [
  '162.105.0.0/16',
  '202.112.7.0/24',
  '202.112.8.0/24',
  '222.29.0.0/17',
  '222.29.128.0/19',
  '115.27.0.0/16'
];

const pkuCIDRv6 = [
  '2001:da8:0201::/48',
  '240c:c001::/32'
];

// 将 IP 地址转换为 BigInt 以便比较
function ipToBigInt(ip) {
  if (ip.includes(':')) {
    // IPv6 处理
    const parts = ip.split('::');
    let head = parts[0] ? parts[0].split(':') : [];
    let tail = parts[1] ? parts[1].split(':') : [];
    
    const missing = 8 - (head.length + tail.length);
    const fullParts = [
      ...head,
      ...Array(missing).fill('0'),
      ...tail
    ].map(part => part.padStart(4, '0'));
    
    const fullIPv6 = fullParts.join('');
    return BigInt(`0x${fullIPv6}`);
  } else {
    // IPv4 处理
    return BigInt(ip.split('.')
      .reduce((acc, octet) => (acc << 8n) + BigInt(octet), 0n));
  }
}

// 解析 CIDR 表示法
function parseCIDR(cidr) {
  const [network, prefix] = cidr.split('/');
  const prefixLength = parseInt(prefix, 10);
  const ipBigInt = ipToBigInt(network);
  
  // 计算掩码
  const mask = (1n << (cidr.includes(':') ? 128n : 32n)) - 1n;
  const networkMask = mask ^ ((1n << (cidr.includes(':') ? 128n - BigInt(prefixLength) : 32n - BigInt(prefixLength))) - 1n);
  
  return {
    network: ipBigInt & networkMask,
    mask: networkMask
  };
}

// 检查 IP 是否在 CIDR 范围内
function isIPInCIDR(ip, cidr) {
  const { network, mask } = parseCIDR(cidr);
  const ipBigInt = ipToBigInt(ip);
  return (ipBigInt & mask) === network;
}

// 检查 IP 是否在任何允许的 CIDR 范围内
function isPKUIP(ip) {
  if (ip.includes(':')) {
    return pkuCIDRv6.some(cidr => isIPInCIDR(ip, cidr));
  } else {
    return pkuCIDRv4.some(cidr => isIPInCIDR(ip, cidr));
  }
}