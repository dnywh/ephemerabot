// Get env variables up and running
require("dotenv").config();

// Allow for scheduling tweets
const schedule = require('node-schedule');

// Allow for editing images
const Jimp = require('jimp');

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

function tweetRandomAirtableRecord() {
    base(table).select({
        view: "Grid",
        filterByFormula: "({hidden}= '')", // Only show items that are not hidden
        sort: [{ field: "date", direction: "desc" }], // Overrides what's set in the above view, just in case I forget
    }).eachPage(function page(records, fetchNextPage) {
        // This function (`page`) will get called for each page of records.

        records.forEach(function (record) {
            // Push each record to the array
            allRecords.push(record);
        });


        // To fetch the next page of records, call `fetchNextPage`.
        // If there are more records, `page` will get called again.
        // If there are no more records, `done` will get called.
        fetchNextPage();

    }, function done(err) {
        if (err) { console.error(err); return; }
        // If successful...
        // Select a random record for tweeting
        const record = allRecords[Math.floor(Math.random() * allRecords.length)];
        const recordName = record.get("name");
        const recordDate = record.get("date");
        const recordLocation = record.get("location");
        const recordCountry = record.get("country");
        const recordTags = record.get("tags");
        // Remove dashes/hyphens from each tag array item
        const recordTagsDashed = recordTags.map(i => i.replace(/-/g, ""));
        // Add a hashtag to the start of each tag array item
        const recordTagsHashed = recordTagsDashed.map(i => "#" + i);
        // Format this array into one comma-separated string
        const recordTagsFormatted = recordTagsHashed.join(", ");

        const recordString = `${recordName}. ${recordLocation}, ${recordCountry}. ${recordDate}. Tagged with ${recordTagsFormatted}.`
        // console.log(recordString);

        const recordImageUrl = record.get("images")[0].url;
        // Compose image
        prepareImage(`${recordImageUrl}`);
        // Convert recordImageUrl to base64 for tweeting
        imageToBase64("tweet-img.jpg") // Image URL
            .then(
                (response) => {
                    // Image is now converted, prepare tweet
                    // tweetIt(recordString, response);
                }
            )
            .catch(
                (error) => {
                    console.log(error);
                }
            )
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
// function tweetIt(tweetText, b64content) {
function tweetIt(tweetText, tweetImage) {
    // TODO: Run Airtable from within here?

    // Upload image
    T.post('media/upload', { media_data: tweetImage }, uploaded);

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

// Prepare image
function prepareImage(imageUrl) {
    Jimp.read(imageUrl, (err, image) => {
        if (err) throw err;
        image
            .background(0xFFFFFFFF)
            .contain(2048, 1024)
            // .crop(4000, 3000)
            .write("tweet-img.jpg"); // save
    });
}
// Run instantly
tweetRandomAirtableRecord();
// Run every thirty minutes
schedule.scheduleJob("0 0/30 * 1/1 * ? *", function () {
    tweetRandomAirtableRecord();
});