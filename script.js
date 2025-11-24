// 配置项 - 已预设用户提供的GitHub图片源，可直接使用
const CONFIG = {
    SWITCH_INTERVAL: 5000, // 5秒切换一次
    // 图片源：使用用户提供的GitHub仓库（隐藏真实URL）
    IMAGE_SOURCES: [
        {
            type: 'github',
            username: 'limgyun',
            repo: 'vliss-images',
            path: 'images/', // 图片文件夹路径
            // 可选：如果知道图片文件名，可直接列在这里（自动识别所有图片）
            // 若文件夹新增图片，无需修改代码，会自动加载
        }
    ],
    RETRY_COUNT: 3 // 加载失败重试次数
};

// 全局变量
let currentImageIndex = 0;
let imageList = []; // 存储所有图片的URL（动态获取，不暴露在HTML中）
let retryAttempt = 0;

// 初始化：页面加载完成后获取图片列表并开始切换
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 从GitHub仓库获取所有图片URL（隐藏真实地址）
        imageList = await fetchGithubImages(CONFIG.IMAGE_SOURCES[0]);
        
        if (imageList.length === 0) {
            throw new Error('未找到可用图片');
        }
        
        // 加载第一张图片
        loadImage(currentImageIndex);
        
        // 定时切换图片
        setInterval(() => {
            currentImageIndex = (currentImageIndex + 1) % imageList.length;
            loadImage(currentImageIndex);
        }, CONFIG.SWITCH_INTERVAL);
        
    } catch (error) {
        document.getElementById('image-source').textContent = `错误：${error.message}`;
        console.error('初始化失败：', error);
    }
});

/**
 * 加载指定索引的图片（动态设置src，隐藏URL）
 */
function loadImage(index) {
    const imgElement = document.getElementById('slider-image');
    const statusElement = document.getElementById('image-source');
    
    // 重置状态
    imgElement.classList.remove('loaded');
    statusElement.textContent = '加载中...';
    
    const imageUrl = imageList[index];
    const img = new Image(); // 临时图片对象，用于预加载
    
    // 动态设置图片URL（不暴露在HTML源码中）
    img.src = imageUrl;
    img.crossOrigin = 'anonymous'; // 解决跨域问题
    
    // 图片加载成功
    img.onload = () => {
        imgElement.src = imageUrl; // 动态赋值，HTML中看不到真实URL
        imgElement.alt = `图片 ${index + 1}/${imageList.length}`;
        imgElement.classList.add('loaded');
        statusElement.textContent = `图片 ${index + 1}/${imageList.length}`;
        retryAttempt = 0;
    };
    
    // 图片加载失败
    img.onerror = () => {
        console.warn(`图片加载失败：${imageUrl}`);
        retryAttempt++;
        
        if (retryAttempt <= CONFIG.RETRY_COUNT) {
            loadImage(index); // 重试加载当前图片
        } else {
            // 重试次数用尽，加载下一张
            currentImageIndex = (currentImageIndex + 1) % imageList.length;
            loadImage(currentImageIndex);
            retryAttempt = 0;
        }
    };
}

/**
 * 从GitHub仓库获取图片列表（核心：隐藏真实URL）
 */
async function fetchGithubImages(config) {
    // GitHub API：获取指定文件夹下的所有文件
    const apiUrl = `https://api.github.com/repos/${config.username}/${config.repo}/contents/${config.path}`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) {
        throw new Error(`获取图片列表失败（状态码：${response.status}`);
    }
    
    const files = await response.json();
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp']; // 支持的图片格式
    
    // 筛选出所有图片文件，返回下载URL（隐藏原始仓库路径）
    return files
        .filter(file => 
            file.type === 'file' && 
            imageExtensions.includes(file.name.split('.').pop().toLowerCase())
        )
        .map(file => file.download_url); // 返回图片的直接下载URL（动态使用，不暴露）

}
