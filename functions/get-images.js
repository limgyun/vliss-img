// functions/get-images.js（零过滤极简版，只验证能否读取文件）
export async function onRequest(context) {
  try {
    // 关键：prefix 必须是 "images/"（结尾斜杠不能少，代表根目录下的 images 文件夹）
    const PREFIX = "images/";
    
    // 1. 读取 images 文件夹下的所有资源（包括文件和子文件夹）
    const allResources = await context.env.ASSETS.list({ prefix: PREFIX });
    
    // 2. 只保留文件（排除文件夹：Cloudflare 中文件夹的 name 以 "/" 结尾）
    const onlyFiles = allResources.filter(resource => !resource.name.endsWith('/'));
    
    // 3. 提取文件名（去掉 "images/" 前缀，只留文件名，如 "slide1.jpg"）
    const fileNames = onlyFiles.map(file => file.name.replace(PREFIX, ''));
    
    // 4. 返回详细调试信息，方便排查
    return new Response(JSON.stringify({
      success: true,
      prefix: PREFIX,
      totalResources: allResources.length, // 读取到的所有资源数（文件+文件夹）
      totalFiles: onlyFiles.length,        // 过滤后的文件数
      fileNames: fileNames                 // 具体文件名列表
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    // 返回具体错误（无隐藏）
    return new Response(JSON.stringify({
      success: false,
      errorType: error.name,
      errorMsg: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
