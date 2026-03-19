// Элементы DOM
const modeRadios = document.querySelectorAll('input[name="mode"]');
const botTokenInput = document.getElementById('botToken');
const chatIdInput = document.getElementById('chatId');
const postTextInput = document.getElementById('postText');
const fileIdGroup = document.getElementById('fileIdGroup');
const fileIdInput = document.getElementById('fileId');
const jsonParseBtn = document.getElementById('jsonParseBtn');
const withButtonCheckbox = document.getElementById('withButton');
const buttonFields = document.getElementById('buttonFields');
const buttonTextInput = document.getElementById('buttonText');
const buttonUrlInput = document.getElementById('buttonUrl');
const prefilledTextInput = document.getElementById('prefilledText');
const outputLink = document.getElementById('outputLink');
const outputGroup = document.querySelector('.output-section');
const copyBtn = document.getElementById('copyBtn');
const resetBtn = document.getElementById('resetBtn');

// Элементы счётчика
const charCounter = document.getElementById('charCounter');
const charCount = document.getElementById('charCount');
const charLimit = document.getElementById('charLimit');

// Обязательные поля
let requiredFields = [botTokenInput, chatIdInput, postTextInput];

// Лимиты символов
const LIMITS = {
    text: 4096,
    photo: 1024,
    video: 1024
};

// Ключ для localStorage
const STORAGE_KEY = 'telegram_link_generator_v2';

// Grapheme segmenter
let graphemeSegmenter = null;

// Инициализация
function init() {
    try {
        graphemeSegmenter = new Intl.Segmenter('ru', { granularity: 'grapheme' });
    } catch (e) {
        console.warn('Intl.Segmenter не поддерживается');
    }
    
    loadFromStorage();
    
    modeRadios.forEach(radio => {
        radio.addEventListener('change', handleModeChange);
    });

    withButtonCheckbox.addEventListener('change', handleButtonCheckbox);

    const allInputs = [
        botTokenInput, chatIdInput, postTextInput, 
        fileIdInput, buttonTextInput, buttonUrlInput, prefilledTextInput
    ];
    
    allInputs.forEach(input => {
        input.addEventListener('input', handleInputChange);
        // Обработка вставки для trim
        input.addEventListener('paste', handlePaste);
    });

    postTextInput.addEventListener('input', updateCharCounter);

    copyBtn.addEventListener('click', copyLink);
    resetBtn.addEventListener('click', showResetConfirmation);
    jsonParseBtn.addEventListener('click', parseJsonFromClipboard);

    initFormattingToolbar();
    
    updateCharLimit();
    updateCharCounter();
    updateRequiredFields();
    validateFields();
    generateLink();
}

// Инициализация панели форматирования
function initFormattingToolbar() {
    const formatBtns = document.querySelectorAll('.format-btn');
    formatBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.dataset.tag;
            wrapSelection(tag);
        });
    });
    
    // Горячие клавиши
    postTextInput.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            let tag = null;
            switch (e.key.toLowerCase()) {
                case 'b': tag = 'b'; break;
                case 'i': tag = 'i'; break;
                case 'u': tag = 'u'; break;
            }
            if (tag) {
                e.preventDefault();
                wrapSelection(tag);
            }
        }
    });
}

// Обёртка выделенного текста в тег
function wrapSelection(tag) {
    const textarea = postTextInput;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    const openTag = `<${tag}>`;
    const closeTag = `</${tag}>`;
    
    if (start === end) {
        const newText = text.substring(0, start) + openTag + closeTag + text.substring(end);
        textarea.value = newText;
        textarea.focus();
        textarea.setSelectionRange(start + openTag.length, start + openTag.length);
    } else {
        const selectedText = text.substring(start, end);
        const newText = text.substring(0, start) + openTag + selectedText + closeTag + text.substring(end);
        textarea.value = newText;
        textarea.focus();
        textarea.setSelectionRange(start + openTag.length, end + openTag.length);
    }
    
    textarea.dispatchEvent(new Event('input'));
}

// Обработка вставки - trim для определённых полей и попытка сохранить форматирование
function handlePaste(e) {
    const input = e.target;
    const fieldName = input.id;
    
    // Поля, где нужно trim при вставке
    const trimFields = ['botToken', 'chatId', 'fileId', 'buttonUrl'];
    
    // Попытка извлечь HTML форматирование для текста поста
    if (fieldName === 'postText') {
        e.preventDefault();
        
        const clipboardData = e.clipboardData || window.clipboardData;
        const htmlData = clipboardData.getData('text/html');
        const textData = clipboardData.getData('text/plain');
        
        if (htmlData) {
            // Пытаемся конвертировать HTML в Telegram формат
            const converted = convertHtmlToTelegram(htmlData);
            insertAtCursor(input, converted);
        } else {
            insertAtCursor(input, textData);
        }
        input.dispatchEvent(new Event('input'));
        return;
    }
    
    // Trim для технических полей
    if (trimFields.includes(fieldName)) {
        setTimeout(() => {
            const trimmed = input.value.trim();
            if (trimmed !== input.value) {
                input.value = trimmed;
                showToast('Пробелы по краям удалены');
            }
            input.dispatchEvent(new Event('input'));
        }, 0);
    }
}

// Вставка текста в позицию курсора
function insertAtCursor(input, text) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const before = input.value.substring(0, start);
    const after = input.value.substring(end);
    
    input.value = before + text + after;
    input.selectionStart = input.selectionEnd = start + text.length;
}

// Конвертация HTML в Telegram формат
function convertHtmlToTelegram(html) {
    // Создаём временный элемент для парсинга
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Удаляем стили и классы
    temp.querySelectorAll('*').forEach(el => {
        el.removeAttribute('style');
        el.removeAttribute('class');
    });
    
    // Конвертируем теги
    const tagMap = {
        'b': 'b',
        'strong': 'b',
        'i': 'i',
        'em': 'i',
        'u': 'u',
        's': 's',
        'strike': 's',
        'del': 's',
        'code': 'code',
        'pre': 'pre',
        'blockquote': 'blockquote'
    };
    
    // Обрабатываем каждый тег
    Object.keys(tagMap).forEach(htmlTag => {
        const telegramTag = tagMap[htmlTag];
        temp.querySelectorAll(htmlTag).forEach(el => {
            const newEl = document.createElement(telegramTag);
            newEl.innerHTML = el.innerHTML;
            el.replaceWith(newEl);
        });
    });
    
    // Извлекаем текст с сохранением тегов
    let result = temp.innerHTML;
    
    // Убираем лишние теги, оставляем только разрешённые
    const allowedTags = ['b', 'i', 'u', 's', 'code', 'pre', 'blockquote', 'spoiler'];
    result = result.replace(/<\/?(?!\/?(b|i|u|s|code|pre|blockquote|spoiler)\b)[^>]*>/gi, '');
    
    // Декодируем HTML сущности
    const textarea = document.createElement('textarea');
    textarea.innerHTML = result;
    result = textarea.value;
    
    return result;
}

// Извлечение file_id из JSON
async function parseJsonFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        
        if (!text.trim().startsWith('{')) {
            showToast('Буфер обмена не содержит JSON', true);
            return;
        }
        
        const json = JSON.parse(text);
        const fileId = extractFileId(json);
        
        if (fileId) {
            fileIdInput.value = fileId;
            fileIdInput.dispatchEvent(new Event('input'));
            showToast('File ID извлечён');
        } else {
            showToast('File ID не найден в JSON', true);
        }
    } catch (e) {
        showToast('Ошибка чтения буфера', true);
    }
}

// Извлечение file_id из структуры JSON
function extractFileId(json) {
    // Проверяем message
    const message = json.message || json.edited_message || json.channel_post || json.edited_channel_post;
    if (!message) return null;
    
    // Приоритет поиска file_id (от более специфичных к менее)
    const sources = [
        message.video,
        message.animation,
        message.document,
        message.audio,
        message.voice,
        message.video_note,
        message.sticker,
    ];
    
    for (const source of sources) {
        if (source && source.file_id) {
            return source.file_id;
        }
    }
    
    // Фото - берём последнее (самое большое)
    if (message.photo && Array.isArray(message.photo) && message.photo.length > 0) {
        return message.photo[message.photo.length - 1].file_id;
    }
    
    return null;
}

// Показать toast уведомление
function showToast(message, isError = false) {
    // Удаляем предыдущий toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast' + (isError ? ' error' : '');
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 2500);
}

// Обработка ввода
function handleInputChange() {
    saveToStorage();
    debounce(generateLink, 100)();
}

// Подсчёт графем
function countGraphemes(text) {
    if (graphemeSegmenter) {
        const segments = graphemeSegmenter.segment(text);
        let count = 0;
        for (const segment of segments) {
            count++;
        }
        return count;
    }
    return [...text].length;
}

function getCurrentLimit() {
    const mode = getSelectedMode();
    return LIMITS[mode] || LIMITS.text;
}

function updateCharLimit() {
    charLimit.textContent = getCurrentLimit();
}

function updateCharCounter() {
    const text = postTextInput.value;
    const count = countGraphemes(text);
    const limit = getCurrentLimit();
    
    charCount.textContent = count;
    
    charCounter.classList.remove('normal', 'warning', 'exceeded');
    
    if (count > limit) {
        charCounter.classList.add('exceeded');
    } else if (count >= limit * 0.8) {
        charCounter.classList.add('warning');
    } else {
        charCounter.classList.add('normal');
    }
    
    saveToStorage();
}

function handleModeChange() {
    const mode = getSelectedMode();
    
    fileIdGroup.classList.toggle('hidden', mode === 'text');
    
    updateCharLimit();
    updateCharCounter();
    updateRequiredFields();
    validateFields();
    generateLink();
    saveToStorage();
}

function handleButtonCheckbox() {
    buttonFields.classList.toggle('hidden', !withButtonCheckbox.checked);
    
    updateRequiredFields();
    validateFields();
    generateLink();
    saveToStorage();
}

function getSelectedMode() {
    const checked = document.querySelector('input[name="mode"]:checked');
    return checked ? checked.value : 'text';
}

function updateRequiredFields() {
    const mode = getSelectedMode();
    const withButton = withButtonCheckbox.checked;
    
    document.querySelectorAll('.form-group').forEach(g => g.classList.remove('required', 'filled'));
    
    requiredFields = [botTokenInput, chatIdInput, postTextInput];
    
    if (mode === 'photo' || mode === 'video') {
        requiredFields.push(fileIdInput);
    }
    
    if (withButton) {
        requiredFields.push(buttonTextInput);
        requiredFields.push(buttonUrlInput);
    }
    
    requiredFields.forEach(input => {
        const group = input.closest('.form-group');
        if (group) group.classList.add('required');
    });
}

function validateFields() {
    let allValid = true;
    
    requiredFields.forEach(input => {
        const group = input.closest('.form-group');
        const isValid = input.value.trim() !== '';
        
        group.classList.toggle('filled', isValid);
        if (!isValid) allValid = false;
    });
    
    return allValid;
}

function encodeUrlParam(str) {
    return encodeURIComponent(str);
}

function generateLink() {
    const isValid = validateFields();
    const text = postTextInput.value;
    const limit = getCurrentLimit();
    const isWithinLimit = countGraphemes(text) <= limit;
    
    if (!isValid || !isWithinLimit) {
        outputLink.value = '';
        outputGroup.classList.remove('has-link');
        copyBtn.classList.add('hidden');
        return;
    }
    
    const mode = getSelectedMode();
    const botToken = botTokenInput.value.trim();
    const chatId = chatIdInput.value.trim();
    const postText = postTextInput.value;
    const fileId = fileIdInput.value.trim();
    const withButton = withButtonCheckbox.checked;
    const buttonText = buttonTextInput.value.trim();
    const buttonUrlValue = buttonUrlInput.value.trim();
    const prefilledText = prefilledTextInput.value.trim();
    
    let baseUrl, textParam;
    
    switch (mode) {
        case 'photo':
            baseUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;
            textParam = 'caption';
            break;
        case 'video':
            baseUrl = `https://api.telegram.org/bot${botToken}/sendVideo`;
            textParam = 'caption';
            break;
        default:
            baseUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
            textParam = 'text';
    }
    
    const params = [];
    params.push(`chat_id=${encodeUrlParam(chatId)}`);
    
    if (mode === 'photo') params.push(`photo=${encodeUrlParam(fileId)}`);
    if (mode === 'video') params.push(`video=${encodeUrlParam(fileId)}`);
    
    params.push(`${textParam}=${encodeUrlParam(postText)}`);
    params.push('parse_mode=HTML');
    
    if (withButton && buttonText && buttonUrlValue) {
        const replyMarkup = buildReplyMarkup(buttonText, buttonUrlValue, prefilledText);
        params.push(`reply_markup=${encodeUrlParam(replyMarkup)}`);
    }
    
    outputLink.value = `${baseUrl}?${params.join('&')}`;
    outputGroup.classList.add('has-link');
    copyBtn.classList.remove('hidden');
}

function buildReplyMarkup(text, url, prefilled) {
    let finalUrl = url;
    
    if (prefilled && url.includes('t.me/')) {
        const separator = url.includes('?') ? '&' : '?';
        finalUrl = `${url}${separator}text=${encodeUrlParam(prefilled)}`;
    }
    
    return JSON.stringify({
        inline_keyboard: [[{ text, url: finalUrl }]]
    });
}

async function copyLink() {
    const link = outputLink.value;
    if (!link) return;
    
    try {
        await navigator.clipboard.writeText(link);
        const original = copyBtn.textContent;
        copyBtn.textContent = 'Скопировано';
        copyBtn.classList.add('copied');
        setTimeout(() => {
            copyBtn.textContent = original;
            copyBtn.classList.remove('copied');
        }, 1500);
    } catch (e) {
        outputLink.select();
        document.execCommand('copy');
    }
}

function showResetConfirmation() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <h3>Сбросить форму?</h3>
            <p>Все введённые данные будут удалены</p>
            <div class="modal-buttons">
                <button class="modal-btn cancel">Отмена</button>
                <button class="modal-btn confirm">Сбросить</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    overlay.querySelector('.modal-btn.cancel').onclick = () => overlay.remove();
    overlay.querySelector('.modal-btn.confirm').onclick = () => {
        resetAllFields();
        overlay.remove();
    };
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

function resetAllFields() {
    document.querySelector('input[name="mode"][value="text"]').checked = true;
    
    botTokenInput.value = '';
    chatIdInput.value = '';
    postTextInput.value = '';
    fileIdInput.value = '';
    buttonTextInput.value = '';
    buttonUrlInput.value = '';
    prefilledTextInput.value = '';
    
    withButtonCheckbox.checked = false;
    fileIdGroup.classList.add('hidden');
    buttonFields.classList.add('hidden');
    
    localStorage.removeItem(STORAGE_KEY);
    
    updateCharLimit();
    updateCharCounter();
    updateRequiredFields();
    validateFields();
    generateLink();
}

function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        mode: getSelectedMode(),
        botToken: botTokenInput.value,
        chatId: chatIdInput.value,
        postText: postTextInput.value,
        fileId: fileIdInput.value,
        withButton: withButtonCheckbox.checked,
        buttonText: buttonTextInput.value,
        buttonUrl: buttonUrlInput.value,
        prefilledText: prefilledTextInput.value
    }));
}

function loadFromStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    
    try {
        const data = JSON.parse(saved);
        
        const modeRadio = document.querySelector(`input[name="mode"][value="${data.mode}"]`);
        if (modeRadio) {
            modeRadio.checked = true;
            if (data.mode !== 'text') fileIdGroup.classList.remove('hidden');
        }
        
        botTokenInput.value = data.botToken || '';
        chatIdInput.value = data.chatId || '';
        postTextInput.value = data.postText || '';
        fileIdInput.value = data.fileId || '';
        buttonTextInput.value = data.buttonText || '';
        buttonUrlInput.value = data.buttonUrl || '';
        prefilledTextInput.value = data.prefilledText || '';
        
        if (data.withButton) {
            withButtonCheckbox.checked = true;
            buttonFields.classList.remove('hidden');
        }
    } catch (e) {}
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

document.addEventListener('DOMContentLoaded', init);
