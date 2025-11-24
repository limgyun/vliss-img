// 配置项 - 仅需配置仓库信息，无需手动添加图片URL
const CONFIG = {
    SWITCH_INTERVAL: 5000, // 5秒切换
    GITHUB: {
        username: 'limgyun', // 你的GitHub用户名
        repo: 'vliss-images', // 图片仓库名
        path: 'images/', // 图片文件夹路径
        // 混淆密钥（简单混淆文件名列表，防直接读取）
        encryptKey: 'vliss_2024' // 可自定义修改
    },
    RANDOM_PARAM: true, // 加载时添加随机参数
    RETRY_COUNT: 3,
    // 支持的图片格式（自动过滤非图片文件）
    imageExtensions: ['png', 'jpg', 'jpeg', 'gif', 'webp']
};

// 全局变量
let currentIndex = 0;
let encryptedFilenames = []; // 存储混淆后的文件名列表
let totalImages = 0;

// 简单混淆/解混淆函数（防止文件名列表被直接抓取）
function encryptDecrypt(str, key) {
    let result = '';
    for (let i = 0; i < str.length; i++) {
        const keyChar = key.charCodeAt(i % key.length);
        result += String.fromCharCode(str.charCodeAt(i) ^ keyChar);
    }
    return btoa(result); // 转Base64进一步隐藏
}

function decryptEncrypt(encodedStr, key) {
    try {
        const decoded = atob(encodedStr);
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
            const keyChar = key.charCodeAt(i % key.length);
            result += String.fromCharCode(decoded.charCodeAt(i) ^ keyChar);
        }
        return result;
    } catch (e) {
        console.error('解混淆失败：', e);
        return '';
    }
}

// 动态构造GitHub API URL（防抓包识别）
function getGithubApiUrl() {
    const { username, repo, path } = CONFIG.GITHUB;
    // 动态拼接API URL，避免硬编码被直接识别
    const apiHost = 'api.github.com';
    const apiPath = `repos/${username}/${repo}/contents/${path}`;
    // 用字符串拼接隐藏完整URL
    return `https://${apiHost}/${apiPath}`;
}

// 初始化：获取并混淆文件名列表
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. 动态请求GitHub API，获取文件列表（仅获取文件名，不获取完整URL）
        const fileNames = await fetchImageFilenames();
        
        if (fileNames.length === 0) {
            throw new Error('仓库中未找到可用图片');
        }
        
        totalImages = fileNames.length;
        // 2. 混淆文件名列表（存储在内存中，防直接读取）
        encryptedFilenames = fileNames.map(name => encryptDecrypt(name, CONFIG.GITHUB.encryptKey));
        
        // 3. 开始加载第一张图片
        loadImage(currentIndex);
        
        // 4. 定时切换
        setInterval(() => {
            currentIndex = (currentIndex + 1) % totalImages;
            loadImage(currentIndex);
        }, CONFIG.SWITCH_INTERVAL);
        
    } catch (error) {
        document.getElementById('image-source').textContent = `加载失败：${error.message}`;
        console.error('初始化错误：', error);
    }
});

// 从GitHub API获取图片文件名列表（仅获取文件名，不获取URL）
async function fetchImageFilenames() {
    const apiUrl = getGithubApiUrl();
    
    try {
        // 动态设置请求头，模拟浏览器请求，防API拦截
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败（状态码：${response.status}`);
        }
        
        const files = await response.json();
        // 筛选图片文件，仅返回文件名（不返回URL）
        return files
            .filter(file => {
                if (file.type !== 'file') return false;
                const ext = file.name.split('.').pop().toLowerCase();
                return CONFIG.imageExtensions.includes(ext);
            })
            .map(file => file.name); // 仅保留文件名，不保留完整URL
        
    } catch (error) {
        console.error('获取文件名失败：', error);
        throw error;
    }
}

// 加载图片（核心：动态构造URL+混淆处理）
function loadImage(index) {
    const imgElement = document.getElementById('slider-image');
    const statusElement = document.getElementById('image-source');
    
    // 重置状态
    imgElement.classList.remove('loaded');
    statusElement.textContent = `加载图片 ${index + 1}/${totalImages}`;
    
    // 1. 解混淆获取当前图片文件名
    const encryptedName = encryptedFilenames[index];
    const fileName = decryptEncrypt(encryptedName, CONFIG.GITHUB.encryptKey);
    
    if (!fileName) {
        statusElement.textContent = `图片 ${index + 1} 解析失败`;
        currentIndex = (currentIndex + 1) % totalImages;
        loadImage(currentIndex);
        return;
    }
    
    // 2. 动态构造完整图片URL（不提前存储，仅在加载时构造）
    const { username, repo, path } = CONFIG.GITHUB;
    // 动态拼接URL，避免硬编码
    let imageUrl = `https://raw.githubusercontent.com/${username}/${repo}/main/${path}${fileName}`;
    
    // 3. 添加随机参数，防缓存和批量抓取
    if (CONFIG.RANDOM_PARAM) {
        const randomParam = `t=${Date.now() + Math.floor(Math.random() * 100000)}`;
        imageUrl += imageUrl.includes('?') ? `&${randomParam}` : `?${randomParam}`;
    }
    
    // 4. 预加载图片
    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    tempImg.src = imageUrl;
    
    // 加载成功
    tempImg.onload = () => {
        imgElement.src = imageUrl; // 动态赋值，仅当前URL暴露在Network中
        imgElement.alt = `图片 ${index + 1} - ${fileName}`;
        imgElement.classList.add('loaded');
        statusElement.textContent = `图片 ${index + 1}/${totalImages}`;
    };
    
    // 加载失败重试
    tempImg.onerror = () => {
        console.warn(`图片 ${fileName} 加载失败`);
        let retry = 0;
        const retryLoad = () => {
            if (retry < CONFIG.RETRY_COUNT) {
                // 重试时重新构造URL（更新随机参数）
                let retryUrl = `https://raw.githubusercontent.com/${username}/${repo}/main/${path}${fileName}`;
                if (CONFIG.RANDOM_PARAM) {
                    retryUrl += `?t=${Date.now() + Math.floor(Math.random() * 100000)}`;
                }
                tempImg.src = retryUrl;
                retry++;
            } else {
                // 重试失败，切换到下一张
                currentIndex = (currentIndex + 1) % totalImages;
                loadImage(currentIndex);
            }
        };
        retryLoad();
    };
}

// 可选：禁止右键保存（轻度防护）
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});