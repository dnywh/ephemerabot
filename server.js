// Get env variables up and running
require("dotenv").config();

// Allow for scheduling
const schedule = require('node-schedule');

// Allow for image conversion
const imageToBase64 = require('image-to-base64');

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

function tweetFromAirtable() {
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
        const record = allRecords[Math.floor(Math.random() * allRecords.length)];
        // return record;
        const recordName = record.get("name");
        const recordDate = record.get("date");
        const recordLocation = record.get("location");
        const recordCountry = record.get("country");
        const recordTags = record.get("tags");
        // Add a hastag to the start of each tag array item
        const recordTagsHashed = recordTags.map(i => "#" + i)
        // Format these items in a list
        const recordTagsFormatted = recordTagsHashed.join(", ")

        const recordString = `${recordName}. ${recordLocation}, ${recordCountry}. ${recordDate}. Tagged with ${recordTagsFormatted}.`
        console.log(recordString);

        const recordImageUrl = record.get("images")[0].url;
        // Convert recordImageUrl to base64 for tweeting
        imageToBase64(recordImageUrl) // Image URL
            .then(
                (response) => {
                    // Image is now converted, prepare tweet
                    tweetIt(recordString, response);
                }
            )
            .catch(
                (error) => {
                    console.log(error);
                }
            )
    });
}

function tweetIt(tweetText, b64content) {
    // TODO: Run Airtable from within here?

    // Upload image
    T.post('media/upload', { media_data: b64content }, uploaded);

    // Once image is uploaded on Twitter
    function uploaded(err, data, response) {
        // Prepare tweet content
        const tweetContent = {
            status: tweetText,
            // Put Twitter's image ID into an array
            media_ids: new Array(data.media_id_string)
        }

        // Tweet it!
        T.post('statuses/update', tweetContent, onTweeted);
    }

    // After the tweet has been sent...
    function onTweeted(err, reply) {
        if (err !== undefined) {
            console.log(err)
        } else {
            console.log('Tweeted: ' + reply.text)
        }
    }
}

// Run instantly
tweetFromAirtable();

// // Then run again every hour
// // setInterval(tweetFromAirtable(), 1000 * 60 * 60);
// // Run every day at 8am
// schedule.scheduleJob("0 0 8 1/1 * ? *", function () {
//     tweetFromAirtable();
// })

// TODO: random ephemera of the week (Throwback Thursday)