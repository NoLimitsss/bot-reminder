const tg = window.Telegram.WebApp;
tg.ready();

// Подставляем имя
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    document.getElementById('username').innerText = tg.initDataUnsafe.user.first_name;
}

// Логика переключения экранов
function showScreen(screenName) {
    document.getElementById('main-screen').style.display = (screenName === 'main') ? 'block' : 'none';
    document.getElementById('add-screen').style.display = (screenName === 'add') ? 'flex' : 'none';
}

// Заставка: исчезает через 1 секунду после полной загрузки
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        splash.style.opacity = '0';
        splash.style.visibility = 'hidden';
    }, 1000);
});