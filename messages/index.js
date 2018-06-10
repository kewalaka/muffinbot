/*----------------------------------------------------------------------------------------
* Azure Functions bot templates use Azure Functions Pack for optimal performance, get 
* familiar with Azure Functions Pack at https://github.com/Azure/azure-functions-pack

* This template demonstrates how to use an IntentDialog with a LuisRecognizer to add 
* natural language support to a bot. 
* For a complete walkthrough of creating this type of bot see the article at
* https://aka.ms/abs-node-luis
* ---------------------------------------------------------------------------------------- */

"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var path = require('path');
const spellService = require('./spell-service');
var dotenvextended = require('dotenv-extended');

dotenvextended.load();

var useEmulator = (process.env.NODE_ENV == 'development');

var HelpMessage = '\nI\'m Muffin, the motel catbot (meiow)!  I can help you with checking availability & answering questions about Timandra Motel facilities.';
var UserNameKey = 'UserName';
var UserWelcomedKey = 'UserWelcomed';

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MICROSOFT_APP_ID'],
    appPassword: process.env['MICROSOFT_APP_PASSWORD']
});

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */

// var tableName = 'botdata';
// var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
// var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

var inMemoryStorage = new builder.MemoryBotStorage();

// Create your bot with a function to receive messages from the user
// This default message handler is invoked if the user's utterance doesn't
// match any intents handled by other dialogs.
var bot = new builder.UniversalBot(connector, function (session, args) {
    session.send('Sorry I didn\'t understand, I\'m not too bright, but I am learning. You said \'%s\'.', session.message.text);

});

bot.localePath(path.join(__dirname, './locale'));
bot.set('storage', inMemoryStorage);

// Enable Conversation Data persistence
bot.set('persistConversationData', true);

const LuisModelUrl = process.env['LUIS_MODEL_URL'];

// Create a recognizer that gets intents from LUIS, and add it to the bot
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
bot.recognizer(recognizer);

// Add a dialog for each intent that the LUIS app recognizes.
// See https://docs.microsoft.com/en-us/bot-framework/nodejs/bot-builder-nodejs-recognize-intent-luis 
// Greet dialog
bot.dialog('GreetingDialog', new builder.SimpleDialog(function (session, results) {
    if (results && results.response) {
        session.userData[UserNameKey] = results.response;
        return session.endDialog('Hello %s, how can I help you today?', results.response);
    }

    if (!session.userData[UserNameKey]) {
        builder.Prompts.text(session, 'Before get started, please tell me your name?');
    }

})).triggerAction({
    matches: 'Greeting'
});


// Bot introduces itself and says hello upon conversation start
bot.on('conversationUpdate', (message) => {    
    if (message.membersAdded[0].id === message.address.bot.id) {             
          var reply = new builder.Message()    
                .address(message.address)    
                .text('Hello, %s', HelpMessage);
          bot.send(reply);    
          bot.beginDialog(message.address,'GreetingDialog');
    }
 });

// example sending a video
bot.dialog('ThingsToDo',
    (session) => {
        /* Using message builder
        const msg = new builder.Message(session);
        msg.addAttachment({contentType: 'video/mp4', contentUrl: 'https://youtu.be/AscXhaEaRvA'});
        */
        
        // using video card
        const card = new builder.VideoCard(session)
            .title('Things to do in New Plymouth')
            .image('https://yt3.ggpht.com/a-/ACSszfEWC30Ls9u-t-wzz3BwnRlJGOPX9nu1MhHftQ=s88-mo-c-c0xffffffff-rj-k-no')
            .media([
                { 
                    url: 'https://youtu.be/AscXhaEaRvA'
                }
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://www.youtube.com/watch?v=AscXhaEaRvA', 'Watch on Youtube')
            ]);
        
        const msg = new builder.Message(session).addAttachment(card);
        session.send(msg);
        session.endDialog();
    }
).triggerAction({
    matches: 'ThingsTodo'
})

bot.dialog('HelpDialog',
    (session) => {
        session.send('You reached the Help intent. You said \'%s\'.', session.message.text);
        session.beginDialog('ThingsToDo');
    }
).triggerAction({
    matches: 'Help'
})

bot.dialog('CheckAvailability',
    (session, args) => {
        console.log(JSON.stringify(args.intent, undefined, 2))

        // how to speak (no way!) this fails as the bot needs to be registered, though:
        session.say("Please hold whilst I think about what I need to check availability");

        // do something with the intents

        // find a specific entity
        // var checkInDate = builder.EntityRecognizer.findEntity(args.intent.entities, 'Date.CheckIn');
        // var reply = `It looks like you want to arrive ${checkInDate.entity}`;
        // session.send(reply);

        // resolve the dates
        var checkInDate = builder.EntityRecognizer.resolveTime(args.intent.entities);
        console.log(checkInDate);

        session.endDialog();
    }
).triggerAction({
    matches: 'CheckAvailability'
}) 

// Spell Check
if (process.env.IS_SPELL_CORRECTION_ENABLED === 'true') {
    bot.use({
        botbuilder: (session, next) => {
            spellService
                .getCorrectedText(session.message.text)
                .then(text => {
                    session.message.text = text;
                    next();
                })
                .catch(error => {
                    console.error(error);
                    next();
                });
        }
    });
}

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());    
} else {
    module.exports = connector.listen();
}

