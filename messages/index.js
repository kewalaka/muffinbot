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
var dotenvextended = require('dotenv-extended');

dotenvextended.load();

var useEmulator = (process.env.NODE_ENV == 'development');

var HelpMessage = '\nI\'m Muffin, your friendly catbot, and I can help you with checking availability & answering questions about Timandra Motel facilities.';
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
    //session.send('You reached the default message handler. You said \'%s\'.', session.message.text);
    session.send('This is the start message for a bot');

    if (!session.userData[UserNameKey]) {
        return session.beginDialog('GreetingDialog');
    }

    if (!session.privateConversationData[UserWelcomedKey]) {
        session.send('%s', HelpMessage);
    }

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

        if (!session.privateConversationData[UserWelcomedKey]) {
            session.userData[UserNameKey] = results.response;
            session.privateConversationData[UserWelcomedKey] = true;
            return session.endDialog('Hello %s! %s', results.response, HelpMessage);
        }
        else
        {
            return session.endDialog('Hello %s!', results.response);
        }
    }

    if (!session.userData[UserNameKey]) {
        builder.Prompts.text(session, 'Before get started, please tell me your name?');
    }
})).triggerAction({
    matches: 'Greeting'
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
        
        const msg = new builder.Message(session).addAttachment(card)
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
        session.send('You reached the Check Availability intent. You said \'%s\'.', session.message.text);

        // do something with the intents
        var checkInDate = builder.EntityRecognizer.findEntity(args.intent.entities, 'Date.CheckIn');
        var reply = `It looks like you want to arrive ${checkInDate.entity}`;
        session.send(reply);
        session.endDialog();
    }
).triggerAction({
    matches: 'CheckAvailability'
}) 

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

