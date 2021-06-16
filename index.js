const TelegramBot = require('node-telegram-bot-api');
const express = require('express')

// const { countries } = require('country-flags-svg');
const svg2img = require('svg2img');
const { fill } = require('lodash');
const util = require('util');

const token = process.env.BOT_API_KEY;

let countries = [
    {
        name: 'Україна',
        flag: 'https://upload.wikimedia.org/wikipedia/commons/4/49/Flag_of_Ukraine.svg'
    },
    {
        name: 'США',
        flag: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Flag_of_the_United_States.svg/2560px-Flag_of_the_United_States.svg.png'
    },
    {
        name: 'Німеччина',
        flag: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Flag_of_Germany.svg/2560px-Flag_of_Germany.svg.png'
    },
    {
        name: 'Польща',
        flag: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Flag_of_Poland.svg/2560px-Flag_of_Poland.svg.png'
    },
    {
        name: 'Словаччина',
        flag: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Flag_of_Slovakia.svg/2560px-Flag_of_Slovakia.svg.png'
    },
    {
        name: 'Росія',
        flag: 'https://upload.wikimedia.org/wikipedia/commons/f/f3/Flag_of_Russia.svg'
    },
    {
        name: 'Австрія',
        flag: 'https://visasam.ru/wp-content/uploads/2018/02/900px-Flag_of_Austria.svg_-450x300.png'
    },
    {
        name: 'Азербайджан',
        flag: 'https://flags.ro/wp-content/uploads/Steag-azerbaijan.png'
    },
    {
        name: 'Бразилія',
        flag: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Flag_of_Brazil.svg/250px-Flag_of_Brazil.svg.png'
    },
    {
        name: 'Греція',
        flag: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Flag_of_Greece.svg/1280px-Flag_of_Greece.svg.png'
    },
    {
        name: 'Іспанія',
        flag: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Flag_of_Spain.svg/1125px-Flag_of_Spain.svg.png'
    },
    {
        name: 'Туреччина',
        flag: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Flag_of_Turkey.svg/1200px-Flag_of_Turkey.svg.png'
    },
    {
        name: 'Франція',
        flag: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Flag_of_France.svg/1200px-Flag_of_France.svg.png'
    },
    {
        name: 'Хорватія',
        flag: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Flag_of_Croatia.svg/1200px-Flag_of_Croatia.svg.png'
    },
    {
        name: 'Японія',
        flag: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Flag_of_Japan.svg/1200px-Flag_of_Japan.svg.png'
    },
];

const gameSessions = [];

const bot = new TelegramBot(token, {
    polling: true
});

let showCorrectAnswer = true;

const generateButton = (data) => {
    const randomVariant = Game.getRandomCountry({ excludeName: data.name }).name;
    return [{ text: randomVariant, callback_data: `{"answer": "${randomVariant}"}` }];
};

const insertButtons = (data) => {
    const answerIndex = Game.getRandomIntInclusive(0, 3);

    const buttons = fill(Array(4), null)
        .map(() => generateButton(data));

    buttons[answerIndex][0].text = data.name;
    buttons[answerIndex][0].callback_data = `{"answer": "${data.name}"}`;

    return {
        reply_markup: JSON.stringify({
            inline_keyboard: buttons
        })
    }
};

class Game {
    userId = null;
    chatId = null;
    countryObject = null;
    score = 0;
    counter = 0;

    constructor (chatId, userId) {
        this.chatId = chatId;
        this.userId = userId;
    }

    getUserId () {
        return this.userId;
    }

    getChatId () {
        return this.chatId;
    }

    async start () {
        if (!this.chatId || !this.userId)
            throw new Error('chatId or userId is not defined');

        this.countryObject = Game.getRandomCountry({});

        await this.sendPhoto(this.countryObject.flag);
        await bot.sendMessage(this.chatId, `Виберіть країну на фото:`, insertButtons(this.countryObject));
    }

    async restart () {
        this.refreshCounter();
        this.refreshScore();
        await this.start();
    }

    increaseScore() {
        this.score += 1;
    }

    refreshScore() {
        this.score = 0;
    }

    refreshCounter() {
        this.counter = 0;
    }

    getCounter() {
        return this.counter;
    }

    increaseCounter() {
        this.counter += 1;
    }

    getScore () {
        return this.score;
    }

    getCorrectCountryName () {
        return this.countryObject ? this.countryObject.name : null;
    }

    static getRandomCountry ({ excludeName = null}) {
        const filteredCountries = countries.filter(country => country.name !== excludeName);

        return filteredCountries[Game.getRandomIntInclusive(0, filteredCountries.length - 1)];
    }

    static getRandomIntInclusive (min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    async sendPhoto (photo) {
        console.log('original: ', photo);

        const splitUrl = photo.split('.');
        if (splitUrl[splitUrl.length - 1] === 'svg') {
            photo = await this.parsePhoto(photo);
            return bot.sendPhoto(this.chatId, photo)
        } else {
            return bot.sendPhoto(this.chatId, photo.replace('https', 'http'))
        }
    }

    async parsePhoto (photo) {
        return util.promisify(svg2img)(photo);
    }
}

bot.onText(/\/start/, async (msg) => {
    let game = gameSessions
        .find(session => (session.getUserId() === msg.from.id && session.getChatId() === msg.chat.id));

    if (!game) {
        game = new Game(msg.chat.id, msg.from.id);
        gameSessions.push(game);
    }

    // await bot.sendMessage(msg.chat.id, `${msg.chat.id} ${msg.from.id}`);
    // await bot.sendMessage(msg.chat.id, `${game.getChatId()} ${game.getUserId()}`);

    game.getCounter() >= 10 ?
        await game.restart():
        await game.start();
});


bot.onText(/\/admin/, async (msg) => {
    if (msg.chat.id === msg.from.id) {
        const buttons = {
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{
                        text: showCorrectAnswer ? 'Приховати правильну відповідь' : 'Відображати правильну відповідь',
                        callback_data: `{"setVisibleCorrectAnswer": ${showCorrectAnswer ? '"false"' : '"true"'}}`
                    }],
                    [{
                        text: 'Додати країну',
                        callback_data: '{"addCountryHelp": "true"}'
                    }],
                    [{
                        text: 'Видалити країну',
                        callback_data: '{"removeCountryHelp": "true"}'
                    }],
                    [{
                        text: 'Продовжити',
                        callback_data: '{"continueGame": "true"}'
                    }]
                ]
            })
        };
        await bot.sendMessage(msg.chat.id, `Адмінка:`, buttons );
    }
});

bot.onText(/\/score/, async (msg) => {
    let game = gameSessions
        .find(session => (session.getUserId() === msg.from.id && session.getChatId() === msg.chat.id));

    if (msg.chat.id === msg.from.id && game) {
        let game = gameSessions
            .find(session => (session.getUserId() === msg.from.id && session.getChatId() === msg.chat.id));
        await bot.sendMessage(msg.chat.id, `Ваші бали: ${game.getScore()}` );
    }
});

bot.onText(/\/addCountry/, async (msg) => {
    let game = gameSessions
        .find(session => (session.getUserId() === msg.from.id && session.getChatId() === msg.chat.id));

    if (msg.chat.id === msg.from.id && game) {
        const parseMessage = msg.text.split(' ');

        const newCountry = parseMessage[1];
        const newCountryFlag = parseMessage[2];

        if (!newCountry || !newCountryFlag) {
            await bot.sendMessage(msg.chat.id, 'Ви ввели не вірні дані. Формат повинен бути: /addCountry Україна https://upload.wikimedia.org/wikipedia/commons/4/49/Flag_of_Ukraine.svg' );
        } else {
            countries.push({
                name: newCountry,
                flag: newCountryFlag
            });
        }
    }
});

bot.onText(/\/removeCountry/, async (msg) => {
    let game = gameSessions
        .find(session => (session.getUserId() === msg.from.id && session.getChatId() === msg.chat.id));

    if (msg.chat.id === msg.from.id && game) {
        const parseMessage = msg.text.split(' ');

        const countryToRemove = parseMessage[1];

        if (!countryToRemove) {
            await bot.sendMessage(msg.chat.id, 'Ви ввели не вірні дані. Формат повинен бути: /removeCountry Росія' );
        } else {
            const findCountry = countries.find(item => item.name === countryToRemove);

            if (!findCountry) {
                return bot.sendMessage(msg.chat.id, 'Країну не знайдено, можливо ви помилилсь. Нагадування: чутливість до реєстру (case sensitivity)' );
            }

            countries = countries.filter(country => country !== findCountry)
        }
    }
});

bot.on('callback_query', async (callbackQuery) => {
    const fromId = callbackQuery.from.id;

    let chatId = callbackQuery.message && callbackQuery.message.chat ? callbackQuery.message.chat.id : callbackQuery.chat.id;

    const data = JSON.parse(callbackQuery.data);

    let game = gameSessions
        .find(session => (session.getUserId() === callbackQuery.from.id && session.getChatId() === chatId));

    if (callbackQuery.from.id === chatId && game) {
        const correctAnswer = game.getCorrectCountryName();
        if (data.answer) {
            if (correctAnswer === data.answer) {
                // await bot.editMessageText('Вірно!', opts);
                await bot.sendMessage(chatId, 'Вірно!');
                game.increaseScore();
            } else {
                // await bot.editMessageText('Не вірно! Спробуйте ще раз', opts);
                await bot.sendMessage(chatId, `Не вірно! ${showCorrectAnswer ? 'Правильна відповідь: ' + correctAnswer : '' } `);
            }
            // await bot.sendMessage(chat_instance, `chat_instance: ${chat_instance} chatId: ${msg.chat.id}`);
            game.increaseCounter();

            if (game.getCounter() >= 10) {
                const buttons = {
                    reply_markup: JSON.stringify({
                        inline_keyboard: [
                            [{
                                text: 'Почати заново',
                                callback_data: '{"restart": "true"}'
                            }]
                        ]
                    })
                };
                await bot.sendMessage(chatId, `Ви пройшли 10 тестів, вірних з яких ${game.getScore()}`, buttons );
            } else {
                await game.start();
            }
        }
        if (data.setVisibleCorrectAnswer === "false" || data.setVisibleCorrectAnswer === "true") {
            showCorrectAnswer = data.setVisibleCorrectAnswer === "true";
            console.log(showCorrectAnswer);
            console.log(typeof showCorrectAnswer);
        }
        if (data.restart) {
            await game.restart(chatId);
        }
        if (data.addCountryHelp) {
            await bot.sendMessage(chatId, 'Для додання нової країни формат повинен бути ( Без скобок []! ): /addCountry [назва країни] [посилання на фото прапора]' );
        }
        if (data.removeCountryHelp) {
            await bot.sendMessage(chatId, 'Для видалення країни формат повинен бути ( Без скобок []! ): /removeCountry [назва країни]' );
        }
        if (data.continueGame) {
            await game.start(chatId);
        }
    }
});

var app = express();

app.get('/', function (req, res) {
    res.send('ok')
})
app.listen(process.env.PORT || 4000);
