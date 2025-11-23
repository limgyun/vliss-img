// functions/get-images.js（极简版，只保留必要逻辑）
export async function onRequest(context) {
  try {
    // 1. 读取 images 文件夹（固定 prefix 为 "images/"）
    const files = await context.env.ASSETS.list({ prefix: "images/" });
    
    // 2. 只保留有后缀的文件（不限制格式，简化过滤）
    const imageNames = files
      .filter(file => !file.name.endsWith('/')) // 排除文件夹
      .map(file => file.name.replace("images/", "")) // 只留文件名
      .filter(name => name.includes('.')); // 确保有后缀
    
    // 3. 返回结果
    return new Response(JSON.stringify({
      success: true,
      images: imageNames,
      total: imageNames.length
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
