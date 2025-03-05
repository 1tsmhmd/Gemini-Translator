// تابعی برای افزودن دکمه ترجمه زیر توییت‌های غیر فارسی
async function addTranslateButtons() {
    // Get supported languages from storage
    const { selectedLanguages = ['en', 'ar', 'iw', 'tr'] } = await chrome.storage.sync.get(['selectedLanguages']);
    
    // Filter out 'auto' if present
    const supportedLanguages = selectedLanguages.filter(lang => lang !== 'auto');
    
    // If no specific languages are selected (only 'auto' was selected), use all available languages
    const languagesToUse = supportedLanguages.length > 0 ? supportedLanguages : ['en', 'ar', 'iw', 'tr'];
    
    const tweets = document.querySelectorAll(languagesToUse.map(lang => `div[dir="auto"][lang="${lang}"]`).join(', '));
    
    for (const tweet of tweets) {
        if (tweet.dataset.buttonAdded) continue; // جلوگیری از افزودن دکمه تکراری
        tweet.dataset.buttonAdded = true; // علامت‌گذاری برای جلوگیری از تکرار دکمه
        
        const button = document.createElement('button');
        button.textContent = 'ترجمه توییت';
        button.className = 'translate-button';
        button.style.marginTop = '10px';
        button.style.padding = '5px 10px';
        button.style.backgroundColor = '#749e00';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
        button.style.cursor = 'pointer';
		button.style.textAlign = 'right';
        
        button.addEventListener('click', async (event) => {
            event.stopPropagation(); // جلوگیری از انتشار رویداد کلیک به والدین
            const textContent = tweet.textContent.trim();
            const lang = tweet.getAttribute('lang');
            await performTranslation(tweet, textContent, lang, button);
        });
        
        tweet.insertAdjacentElement('afterend', button);
    }
}
const observer = new MutationObserver(debounce((mutations) => {
    addTranslateButtons();
}, 250));

observer.observe(document.body, {
    childList: true,
    subtree: true
});
// تابع جدید برای انجام ترجمه
async function performTranslation(tweet, textContent, lang, button) {
    // تغییر متن دکمه به "در حال ترجمه..."
    button.textContent = '...در حال ترجمه';
    button.disabled = true; // غیرفعال کردن دکمه برای جلوگیری از کلیک مجدد

    const cleanedText = textContent.replace(/\s+/g, ' ').trim();
    
    let translation = await translateText(cleanedText, lang);
    if (!translation) {
        console.log('...در حال تلاش مجدد برای ترجمه');
        translation = await translateText(cleanedText, lang);
    }
    
    if (translation) {
        // حذف دکمه پس از اتمام ترجمه
        button.remove();

        const hr = document.createElement('hr');
        const fieldset = document.createElement('fieldset');
        const legend = document.createElement('legend');
        
        // ایجاد عنصر legend با آیکون رفرش
        legend.innerHTML = 'ترجمه <span class="refresh-icon" style="cursor: pointer; margin-right: 5px;">&#x21bb;</span>';
        
        fieldset.style.border = '3px solid #749e00';
        fieldset.style.borderRadius = '15px';
        fieldset.style.backgroundColor = '#daffa3';
        fieldset.style.color = '#145b01';
        fieldset.style.textAlign = 'right';
        fieldset.style.direction = 'rtl';
        
        const translatedDiv = document.createElement('div');
        translatedDiv.textContent = translation;
        translatedDiv.className = 'translated-text';
        
        fieldset.appendChild(legend);
        fieldset.appendChild(translatedDiv);
        
        tweet.insertAdjacentElement('afterend', hr);
        hr.insertAdjacentElement('afterend', fieldset);
        
        // افزودن event listener برای آیکون رفرش
        const refreshIcon = legend.querySelector('.refresh-icon');
        refreshIcon.addEventListener('click', async (event) => {
            event.stopPropagation(); // جلوگیری از انتشار رویداد کلیک به والدین
            
            // نمایش حالت بارگذاری
            translatedDiv.textContent = '...در حال ترجمه مجدد';
            
            // انجام ترجمه مجدد
            const newTranslation = await translateText(cleanedText, lang);
            if (newTranslation) {
                translatedDiv.textContent = newTranslation;
            } else {
                translatedDiv.textContent = 'خطا در ترجمه مجدد. لطفاً دوباره تلاش کنید.';
            }
        });
    } else {
        // در صورت عدم موفقیت ترجمه، دکمه را به حالت اولیه بازگردانی کنید
        button.textContent = 'ترجمه توییت';
        button.disabled = false;
    }
}
// Add this at the top of your file
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Modify the scroll listener
window.addEventListener('scroll', debounce(() => {
    addTranslateButtons();
}, 250), { passive: true });
// تابع ترجمه با استفاده از API جمینی
const translationCache = new Map();

async function translateText(text) {
    if (translationCache.has(text)) {
        return translationCache.get(text);
    }
    
    // Get API key and prompt from storage
    const { apiKey, translationPrompt } = await chrome.storage.sync.get(['apiKey', 'translationPrompt']);
    
    if (!apiKey) {
        console.error('API key not found. Please set it in the extension settings.');
        return null;
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const prompt = (translationPrompt || '').replace('<TEXT>', text);
    
    const payload = {
        contents: [{
            parts: [{ text: prompt }]
        }]
    };
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (response.status === 429) {
            // Rate limit hit - wait and retry
            await new Promise(resolve => setTimeout(resolve, 2000));
            return translateText(text);
        }
        
        if (!response.ok) {
            throw new Error(`Translation failed: ${response.status}`);
        }
        
        const result = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (error) {
        console.warn('مشکل در ترجمه:', error.message);
        return null; // تلاش مجدد در صورت خطا
    }
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
        const translation = result.candidates[0].content.parts[0].text;
        translationCache.set(text, translation);
        return translation;
    }
    return null;
}