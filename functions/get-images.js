// functions/get-images.js（后端接口，用于读取 images 文件夹的图片列表）
export async function onRequest(context) {
  try {
    const { request, env, params } = context;
    const imageDir = './images'; // 图片文件夹路径（相对于仓库根目录）
    
    // 读取 images 文件夹的所有文件（Cloudflare Pages Functions 内置文件系统访问）
    const files = await env.ASSETS.list({ prefix: imageDir });
    
    // 支持的图片格式
    const supportedFormats = ['.jpg', '.png', '.webp', '.jpeg', '.gif'];
    
    // 过滤图片文件，获取文件名
    const imageFiles = files
      .filter(file => {
        const ext = file.name.slice(-4).toLowerCase();
        return supportedFormats.includes(ext);
      })
      .map(file => file.name.replace(`${imageDir}/`, '')) // 只保留文件名（如 slide1.jpg）
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })); // 按文件名排序
    
    // 返回图片列表（JSON 格式）
    return new Response(JSON.stringify({ success: true, images: imageFiles }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ success: false, message: '获取图片失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}