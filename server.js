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

// Run instantly
// tweetIt();
// Then run again every minute
setInterval(tweetIt, 1000 * 60 * 0.5);

// Define tweet
function tweetIt() {
    const r = Math.floor(Math.random() * 100);
    // Insert tweet
    const tweet = {
        status: `Random number of the moment is ${r}`
    }

    T.get('account/verify_credentials', {
        include_entities: false,
        skip_status: true,
        include_email: false
    }, onAuthenticated)

    // Run authentication
    function onAuthenticated(err, res) {
        if (err) {
            throw err
        }

        console.log('Authentication successful. Running bot...\r\n')

        // Send tweet
        T.post('statuses/update', tweet, onTweeted)
    }

    function onTweeted(err, reply) {
        if (err !== undefined) {
            console.log(err)
        } else {
            console.log('Tweeted: ' + reply.text)
        }
    }
}


tweetIt();