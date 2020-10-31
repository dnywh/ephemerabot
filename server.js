// Get env variables up and running
require("dotenv").config();

// Initiate Twit
const Twit = require('twit');
const T = new Twit({
    consumer_key: process.env.API_KEY,
    consumer_secret: process.env.API_SECRET_KEY,
    access_token: process.env.ACCESS_TOKEN,
    access_token_secret: process.env.ACCESS_SECRET
});

T.get('account/verify_credentials', {
    include_entities: false,
    skip_status: true,
    include_email: false
}, onAuthenticated)

function onAuthenticated(err, res) {
    if (err) {
        throw err
    }

    console.log('Authentication successful. Running bot...\r\n')

    T.post('statuses/update', {
        status: "Hello from @ephemerabot using env variables."
    }, onTweeted)
}

function onTweeted(err, reply) {
    if (err !== undefined) {
        console.log(err)
    } else {
        console.log('Tweeted: ' + reply.text)
    }
}
