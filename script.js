const tg = window.Telegram.WebApp;
tg.ready();

// Подставляем имя пользователя
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    document.getElementById('username').innerText = tg.initDataUnsafe.user.first_name;
}