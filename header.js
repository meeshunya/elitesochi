// Функция для загрузки шапки
function loadHeader() {
    const headerHTML = `
        <header class="site-header">
            <nav class="navigation">
                <a href="index.html" class="nav-link ${window.location.pathname.includes('index.html') ? 'active' : ''}">Формирование описания звонка</a>
                <a href="page2.html" class="nav-link ${window.location.pathname.includes('page2.html') ? 'active' : ''}">Извлечение ID из текста</a>
                <a href="page3.html" class="nav-link ${window.location.pathname.includes('page3.html') ? 'active' : ''}">Формирование списка сделок на распределение</a>
                <a href="page4.html" class="nav-link ${window.location.pathname.includes('page4.html') ? 'active' : ''}">Рандомизатор</a>
                <a href="page5.html" class="nav-link ${window.location.pathname.includes('page5.html') ? 'active' : ''}">Номера</a
            </nav>
        </header>
        
        <style>
            .site-header {
                background: #ffffff;
                width: 99vw;
                max-width: 99vw;
                padding: 15px 0;
                margin-bottom: 20px;
                box-sizing: border-box;
                position: relative;
                left: 50%;
                right: 50%;
                margin-left: -50vw;
                margin-right: -50vw;
                border-bottom: 1px solid #ecf0f1;

            }
            .navigation {
                display: flex;
                justify-content: center;
                gap: 20px;
                margin: 0 auto;
                padding: 0 20px;
            }
            .nav-link {
                color: #2c3e50;
                text-decoration: none;
                padding: 10px 20px;
                border-radius: 4px;
                font-weight: bold;
                font-size: 14px;
                background-color: rgba(236, 240, 241, 0.3);
                transition: background-color 0.2s;
            }
            .nav-link:hover {
                background-color: #3498db;
                color: #ffffff;
            }
            .nav-link.active {
                background-color: #3498db;
                color: #ffffff;
            }
        </style>
    `;
    
    // Вставляем шапку в начало body
    document.body.insertAdjacentHTML('afterbegin', headerHTML);
}

// Загружаем шапку при загрузке страницы
document.addEventListener('DOMContentLoaded', loadHeader);