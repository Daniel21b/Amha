// Place this file in your root directory alongside script.js
const loadNews = async () => {
    try {
        const response = await fetch('../data/news.json');
        const data = await response.json();
        
        const newsContainer = document.getElementById('news-container');
        
        data.news.forEach(item => {
            const article = document.createElement('article');
            article.className = 'news-card';
            
            article.innerHTML = `
                <div class="news-image">
                    <img src="${item.image}" alt="News image">
                </div>
                <div class="news-content">
                    <h2>
                        <span class="en">${item.title_en}</span>
                        <span class="am">${item.title_am}</span>
                    </h2>
                    <p class="date">${item.date}</p>
                    <p class="excerpt">
                        <span class="en">${item.content_en}</span>
                        <span class="am">${item.content_am}</span>
                    </p>
                </div>
            `;
            
            newsContainer.appendChild(article);
        });
    } catch (error) {
        console.error('Error loading news:', error);
    }
};