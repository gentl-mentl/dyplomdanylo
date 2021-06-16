const TelegramBot = require('node-telegram-bot-api');
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

bot.onText(/\/admin/, async (msg) => {
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
});

bot.onText(/\/score/, async (msg) => {
    await bot.sendMessage(msg.chat.id, `Ваші бали: ${globalScopeGame.getScore()}` );
});

bot.onText(/\/addCountry/, async (msg) => {
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
});

bot.onText(/\/removeCountry/, async (msg) => {
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
});


class Game {
    chatId = null;
    countryObject = null;
    score = 0;
    counter = 0;

    constructor (chatId) {
        this.chatId = chatId;
    }

    getChatId() {
        return this.chatId;
    }

    async start (chatId) {
        if (!this.chatId) {
            this.chatId = chatId;
            if (!this.chatId)
                throw new Error('chatId is not defined');
        }

        this.countryObject = Game.getRandomCountry({});

        await this.sendPhoto(this.countryObject.flag);
        await bot.sendMessage(this.chatId, `Виберіть країну на фото:`, insertButtons(this.countryObject));
    }

    async startAgain (chatId) {
        this.refreshCounter();
        this.refreshScore();
        this.start(chatId);
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


const globalScopeGame = new Game();

bot.onText(/\/start/, async (msg) => {
    await globalScopeGame.start(msg.chat.id);
});

bot.on('callback_query', async (callbackQuery) => {
    const data = JSON.parse(callbackQuery.data);
    const msg = callbackQuery.message;
    const opts = {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
    };

    const correctAnswer = globalScopeGame.getCorrectCountryName();
    if (data.answer) {
        if (globalScopeGame.getCounter() >= 10) {
            return null;
        }
        if (correctAnswer === data.answer) {
            // await bot.editMessageText('Вірно!', opts);
            await bot.sendMessage(msg.chat.id, 'Вірно!');
            globalScopeGame.increaseScore();
        } else {
            // await bot.editMessageText('Не вірно! Спробуйте ще раз', opts);
            await bot.sendMessage(msg.chat.id, `Не вірно! ${showCorrectAnswer ? 'Правильна відповідь: ' + correctAnswer : '' } `);
        }
        globalScopeGame.increaseCounter();
        await globalScopeGame.start(msg.chat.id);
    }
    if (data.setVisibleCorrectAnswer !== null) {
        showCorrectAnswer = !!data.setVisibleCorrectAnswer;
        console.log(showCorrectAnswer);
        console.log(typeof showCorrectAnswer);
    }
    if (data.again) {
        await globalScopeGame.startAgain(msg.chat.id);
    }
    if (data.addCountryHelp) {
        await bot.sendMessage(msg.chat.id, 'Для додання нової країни формат повинен бути ( Без скобок []! ): /addCountry [назва країни] [посилання на фото прапора]' );
    }
    if (data.removeCountryHelp) {
        await bot.sendMessage(msg.chat.id, 'Для видалення країни формат повинен бути ( Без скобок []! ): /removeCountry [назва країни]' );
    }
    if (data.continueGame) {
        await globalScopeGame.start(msg.chat.id);
    }

    if (globalScopeGame.getCounter() >= 10) {
        const buttons = {
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{
                        text: 'Почати заново',
                        callback_data: '{"again": "true"}'
                    }]
                ]
            })
        };
        await bot.sendMessage(msg.chat.id, `Ви пройшли 10 тестів, вірних з яких ${globalScopeGame.getScore()}`, buttons );
    }
});
