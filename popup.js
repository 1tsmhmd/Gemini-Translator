document.addEventListener('DOMContentLoaded', () => {
    // Load saved settings
    chrome.storage.sync.get(['selectedLanguages', 'apiKey', 'translationPrompt1', 'translationPrompt2', 'selectedPrompt'], (result) => {
        const savedLanguages = result.selectedLanguages || ['auto'];
        const savedApiKey = result.apiKey || '';
        const savedPrompt1 = result.translationPrompt1 || '';
        const savedPrompt2 = result.translationPrompt2 || '';
        const selectedPrompt = result.selectedPrompt || 'one';

        // Set saved values
        document.querySelectorAll('input[name="sourceLanguage"]').forEach(checkbox => {
            checkbox.checked = savedLanguages.includes(checkbox.value);
        });
        document.getElementById('api-key').value = savedApiKey;
        document.getElementById('translation-prompt-1').value = savedPrompt1;
        document.getElementById('translation-prompt-2').value = savedPrompt2;
        document.getElementById('one').checked = selectedPrompt === 'one';
        document.getElementById('two').checked = selectedPrompt === 'two';
    });

    // Save settings when button is clicked
    document.getElementById('save-settings').addEventListener('click', () => {
        const selectedLanguages = Array.from(document.querySelectorAll('input[name="sourceLanguage"]:checked'))
            .map(checkbox => checkbox.value);
        const apiKey = document.getElementById('api-key').value.trim();
        const translationPrompt1 = document.getElementById('translation-prompt-1').value.trim();
        const translationPrompt2 = document.getElementById('translation-prompt-2').value.trim();
        const selectedPrompt = document.getElementById('one').checked ? 'one' : 'two';
        
        chrome.storage.sync.set({ 
            selectedLanguages,
            apiKey,
            translationPrompt1,
            translationPrompt2,
            selectedPrompt
        }, () => {
            const status = document.getElementById('status');
            status.style.display = 'block';
            setTimeout(() => {
                status.style.display = 'none';
            }, 2000);
        });
    });
});
