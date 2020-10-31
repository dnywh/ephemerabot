// Get env variables up and running
require("dotenv").config();

// Allow for scheduling
import schedule from 'node-schedule'

// Initiate Twit
const Twit = require('twit');
const T = new Twit({
    consumer_key: process.env.TWITTER_API_KEY,
    consumer_secret: process.env.TWITTER_API_SECRET_KEY,
    access_token: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_SECRET
});


// Get Airtable going
const base = require("airtable").base(process.env.AIRTABLE_BASE_ID);
const table = "Main";

const allRecords = []

base(table).select({
    // Selecting the first 3 records in Grid:
    // maxRecords: 3,
    view: "Grid",
    filterByFormula: "({hidden}= '')", // Only show items that are not hidden
    sort: [{ field: "date", direction: "desc" }], // Overrides what's set in the above view, just in case I forget
}).eachPage(function page(records, fetchNextPage) {
    // This function (`page`) will get called for each page of records.

    records.forEach(function (record) {
        // console.log('Retrieved', record.get('name'));
        allRecords.push(record);
    });


    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
    fetchNextPage();

}, function done(err) {
    if (err) { console.error(err); return; }
    // If successful...
    // Get a random record for later tweeting
    const randomRecord = allRecords[Math.floor(Math.random() * allRecords.length)];

    const randomRecordName = randomRecord.get("name");
    const randomRecordDate = randomRecord.get("date");
    const randomRecordImage = randomRecord.get("images")[0].url;
    // TODO: convert randomRecordImage to base64 for tweeting

    const randomRecordString = `${randomRecordName} from ${randomRecordDate}`



    // Run instantly
    // tweetIt(randomRecordString);
    // Then run again every hour
    // setInterval(tweetIt(randomRecordString), 1000 * 60 * 60);
    // Run every day at 8am
    schedule.scheduleJob("0 0 8 1/1 * ? *", function () {
        tweetIt(randomRecordString);
    })

});

// TODO: random ephemera of the week


function tweetIt(tweetText, tweetImage) {
    // const r = Math.floor(Math.random() * 100);
    // Insert tweet
    const tweet = {
        // status: `Random number of the hour is ${r}`
        status: tweetText,
        // media_ids: [tweetImage]
        // lat: 37.7821120598956,
        // long: -122.400612831116
    }

    console.log(tweet);

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