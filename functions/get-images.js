// functions/get-images.js（宽松过滤版，支持更多格式）
export async function onRequest(context) {
  try {
    const PREFIX = "images/";
    const supportedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.JPG', '.PNG', '.WEBP'];
    
    const allResources = await context.env.ASSETS.list({ prefix: PREFIX });
    const imageFiles = allResources
      .filter(res => !res.name.endsWith('/')) // 排除文件夹
      .map(res => res.name.replace(PREFIX, '')) // 提取文件名
      .filter(name => {
        const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
        return supportedExts.includes(ext); // 宽松格式过滤
      })
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })); // 按数字排序
    
    return new Response(JSON.stringify({
      success: true,
      images: imageFiles
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, errorMsg: error.message }), { status: 500 });
  }
}
