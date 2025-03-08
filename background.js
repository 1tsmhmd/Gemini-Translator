chrome.runtime.onInstalled.addListener(() => {
    // ایجاد گزینه منوی راست‌کلیک
    chrome.contextMenus.create({
        id: "translate-selection",
        title: "Translate Selected Text",
        contexts: ["selection"],
    });
});

// تغییرات مربوط به منوی راست‌کلیک
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getLanguages') {
        chrome.storage.sync.get(['selectedLanguages'], (data) => {
            const languages = data.selectedLanguages || ['auto'];
            sendResponse({ languages });
        });
        return true;
    }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "translate-selection") {
        const selectedText = info.selectionText;
        if (selectedText) {
            // ارسال درخواست ترجمه به API
            translateText(selectedText, tab);
        }
    }
});

async function translateText(text, tab) {
    const { apiKey, translationPrompt1, translationPrompt2, selectedPrompt } = 
        await chrome.storage.sync.get(['apiKey', 'translationPrompt1', 'translationPrompt2', 'selectedPrompt']);

    if (!apiKey) {
        console.error('API key not found.');
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const prompt = selectedPrompt === 'one' ? translationPrompt1.replace('<TEXT>', text) : translationPrompt2.replace('<TEXT>', text);

    const payload = {
        contents: [{ parts: [{ text: prompt }] }]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.status === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            return translateText(text, tab);
        }

        if (!response.ok) {
            throw new Error(`Translation failed: ${response.status}`);
        }

        const result = await response.json();
        const translatedText = result.candidates?.[0]?.content?.parts?.[0]?.text || null;
        
        if (translatedText) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: displayTranslation,
                args: [translatedText]
            });
        }
    } catch (error) {
        console.warn('Translation error:', error.message);
    }
}

function displayTranslation(translatedText) {
    // تزریق فونت Vazirmatn به صورت آفلاین
    const style = document.createElement('style');
    style.textContent = `
        @font-face {
            font-family: 'Vazirmatn';
            src: url('${chrome.runtime.getURL('fonts/Vazirmatn-Regular.woff2')}') format('woff2'),
                 url('${chrome.runtime.getURL('fonts/Vazirmatn-Bold.woff2')}') format('woff2');
            font-weight: normal;
            font-style: normal;
        }
    `;
    document.head.appendChild(style);

    // ایجاد div برای نمایش ترجمه
    const translationDiv = document.createElement('div');
    translationDiv.style.position = 'fixed';
    translationDiv.style.top = '10px';
    translationDiv.style.right = '10px';
    translationDiv.style.backgroundColor = '#fffbff';
    translationDiv.style.color = 'black';
    translationDiv.style.border = '1px solid #ccc';
    translationDiv.style.padding = '10px';
    translationDiv.style.zIndex = 1000;
    translationDiv.style.boxShadow = '0px 4px 6px rgba(0,0,0,0.1)';
    translationDiv.style.fontFamily = "'Vazirmatn', sans-serif";
    translationDiv.style.fontSize = '16px';
    translationDiv.style.direction = 'rtl';

    // تقسیم متن ترجمه‌شده به خطوط مجزا
    const lines = translatedText.split('\n');
    lines.forEach(line => {
        const lineDiv = document.createElement('div');
        lineDiv.textContent = line;
        translationDiv.appendChild(lineDiv);
    });

    // ایجاد دکمه بستن
    const closeButton = document.createElement('button');
    closeButton.textContent = '🗙';
    closeButton.style.marginTop = '10px';
    closeButton.style.padding = '3px 8px';
    closeButton.style.backgroundColor = '#ff4f4f';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '5px';
    closeButton.style.cursor = 'pointer';

    // افزودن دکمه به پنل
    translationDiv.appendChild(closeButton);

    // افزودن پنل به بدنه صفحه
    document.body.appendChild(translationDiv);

    // عملکرد دکمه بستن
    closeButton.addEventListener('click', () => {
        translationDiv.remove();
    });
}



// function displayTranslation(translatedText) {
//    alert("ترجمه: " + translatedText);
// }