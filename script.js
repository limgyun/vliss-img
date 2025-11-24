// 配置项 - 可根据需要修改
const CONFIG = {
    // 图片切换间隔（毫秒）
    SWITCH_INTERVAL: 5000,
    // 图片源配置（选择一种或多种）
    IMAGE_SOURCES: [
        // 1. Picsum Photos（无需API密钥，推荐）
        //{
        //    type: 'picsum',
        //    width: 800,  // 图片宽度
        //    height: 800   // 图片高度
        //},
        // 2. Unsplash（需要API密钥，可选）
        // {
        //     type: 'unsplash',
        //     apiKey: 'YOUR_UNSPLASH_API_KEY',
        //     query: 'nature,landscape',  // 搜索关键词
        //     width: 1200,
        //     height: 800
        // },
        // 3. GitHub仓库图片（需要配置仓库信息，可选）
        {
             type: 'github',
             username: 'limgyun',
             repo: 'vliss-images',
             path: 'images/'  // 图片文件夹路径
         }
    ],
    // 重试次数（图片加载失败时）
    RETRY_COUNT: 3
};

// 全局变量
let currentImageIndex = 0;
let imageSourcesList = [];
let retryAttempt = 0;

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 收集所有可用的图片源
    await initImageSources();
    
    // 加载第一张图片
    loadNextImage();
    
    // 设置自动切换定时器
    setInterval(loadNextImage, CONFIG.SWITCH_INTERVAL);
});

/**
 * 初始化图片源列表
 */
async function initImageSources() {
    for (const source of CONFIG.IMAGE_SOURCES) {
        try {
            switch (source.type) {
                case 'picsum':
                    // Picsum 不需要提前获取列表，每次生成随机URL
                    imageSourcesList.push({
                        type: 'picsum',
                        getUrl: () => `https://picsum.photos/seed/${Math.random().toString(36).substr(2, 9)}/${source.width}/${source.height}`
                    });
                    break;
                    
                case 'unsplash':
                    // Unsplash 需要通过API获取图片列表
                    if (!source.apiKey) throw new Error('Unsplash API密钥未配置');
                    const unsplashImages = await fetchUnsplashImages(source);
                    imageSourcesList.push(...unsplashImages.map(img => ({
                        type: 'unsplash',
                        url: img.url,
                        description: img.description
                    })));
                    break;
                    
                case 'github':
                    // GitHub 需要通过API获取仓库中的图片列表
                    const githubImages = await fetchGithubImages(source);
                    imageSourcesList.push(...githubImages.map(img => ({
                        type: 'github',
                        url: img.url,
                        description: img.name
                    })));
                    break;
            }
        } catch (error) {
            console.warn(`初始化${source.type}图片源失败:`, error.message);
        }
    }
    
    // 如果没有可用图片源，添加默认的Picsum源
    if (imageSourcesList.length === 0) {
        imageSourcesList.push({
            type: 'picsum',
            getUrl: () => `https://picsum.photos/seed/${Math.random().toString(36).substr(2, 9)}/1200/800`
        });
    }
}

/**
 * 加载下一张图片
 */
function loadNextImage() {
    const imageElement = document.getElementById('slider-image');
    const sourceElement = document.getElementById('image-source');
    const spinner = document.querySelector('.loading-spinner');
    
    // 重置加载状态
    imageElement.classList.remove('loaded');
    spinner.style.display = 'block';
    sourceElement.textContent = '加载中...';
    
    // 获取当前图片源
    currentImageIndex = (currentImageIndex + 1) % imageSourcesList.length;
    const currentSource = imageSourcesList[currentImageIndex];
    
    // 获取图片URL
    const imageUrl = currentSource.getUrl ? currentSource.getUrl() : currentSource.url;
    
    // 加载图片
    const img = new Image();
    img.src = imageUrl;
    img.crossOrigin = 'anonymous';  // 解决跨域问题
    
    img.onload = () => {
        // 图片加载成功
        imageElement.src = imageUrl;
        imageElement.alt = currentSource.description || `自动切换图片 ${currentImageIndex + 1}`;
        imageElement.classList.add('loaded');
        sourceElement.textContent = `图片来源: ${get_source_name(currentSource.type)}`;
        retryAttempt = 0;  // 重置重试次数
    };
    
    img.onerror = () => {
        // 图片加载失败，重试
        console.warn(`图片加载失败: ${imageUrl}`);
        retryAttempt++;
        
        if (retryAttempt <= CONFIG.RETRY_COUNT) {
            loadNextImage();
        } else {
            sourceElement.textContent = '图片加载失败，请刷新页面';
            imageElement.src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%2394a3b8%22><path d=%22M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z%22/></svg>';
            imageElement.classList.add('loaded');
            retryAttempt = 0;
        }
    };
}

/**
 * 获取图片源名称（用于显示）
 */
function get_source_name(type) {
    const names = {
        picsum: 'Picsum Photos (随机图片)',
        unsplash: 'Unsplash (高清图片)',
        github: 'GitHub 仓库'
    };
    return names[type] || '未知来源';
}

/**
 * 从Unsplash API获取图片列表
 */
async function fetchUnsplashImages(config) {
    const response = await fetch(
        `https://api.unsplash.com/photos/random?count=20&query=${config.query}&client_id=${config.apiKey}`,
        { method: 'GET' }
    );
    
    if (!response.ok) throw new Error(`Unsplash API请求失败: ${response.status}`);
    
    const data = await response.json();
    return data.map(item => ({
        url: `${item.urls.raw}&w=${config.width}&h=${config.height}&fit=crop`,
        description: item.alt_description || 'Unsplash 图片'
    }));
}

/**
 * 从GitHub仓库获取图片列表
 */
async function fetchGithubImages(config) {
    const apiUrl = `https://api.github.com/repos/${config.username}/${config.repo}/contents/${config.path}`;
    
    const response = await fetch(apiUrl, { method: 'GET' });
    if (!response.ok) throw new Error(`GitHub API请求失败: ${response.status}`);
    
    const data = await response.json();
    // 筛选图片文件（支持常见图片格式）
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    return data
        .filter(item => item.type === 'file' && imageExtensions.includes(item.name.split('.').pop().toLowerCase()))
        .map(item => ({
            url: item.download_url,
            name: item.name
        }));
}