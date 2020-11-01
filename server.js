// Get env variables up and running
require("dotenv").config();

// Allow for scheduling tweets
const schedule = require('node-schedule');

// Allow for image editing
const Jimp = require('jimp');

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

function tweetRandomEphemera() {
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
        // Format date so it can be later programatically changed
        // Pass through the year, month, and day
        const recordDateStructured = new Date(recordDate.substring(0, 4), (recordDate.substring(5, 7) - 1), recordDate.substring(8, 10));
        // Use this to create a readable date format
        const recordDateHuman = recordDateStructured.toLocaleString("default", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

        const recordLocation = record.get("location");
        const recordCountry = record.get("country");
        const recordLocationAndCountry = `${recordLocation}, ${recordCountry}`
        const recordTags = record.get("tags");
        // Remove dashes/hyphens from each tag array item
        const recordTagsDashed = recordTags.map(i => i.replace(/-/g, ""));
        // Add a hashtag to the start of each tag array item
        const recordTagsHashed = recordTagsDashed.map(i => "#" + i);
        // Format this array into one comma-separated string
        const recordTagsFormatted = recordTagsHashed.join(", ");

        const recordString =
            `${recordName}. ${recordLocationAndCountry}. ${recordDateHuman}. Tagged with ${recordTagsFormatted}.`

        const recordImageUrl = record.get("images")[0].url;

        prepareImage(recordImageUrl)
            .then((value) => {
                // Trim off extraenous bits that Jimp adds to base64
                const recordImage = value.substring(23, value.length);
                // Prepare for tweeting
                tweetIt(recordString, recordImage);
            })
    });
}

function tweetIt(tweetText, tweetImage) {
    // TODO: Run Airtable from within here?

    // Upload image
    T.post('media/upload', { media_data: tweetImage }, uploaded);

    // Once image is uploaded on Twitter
    function uploaded(err, data, response) {
        if (err) console.log(err);
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
    return new Promise((resolve, reject) => {
        // Create the white frame
        // Set to 2048x1024 to match Twitter's preferred 1024x512 ratio
        new Jimp(2048, 1024, '#FFFFFF', (err, frame) => {
            if (err) throw err;

            // Then read the ephemera image
            Jimp.read(imageUrl, (err, image) => {
                if (err) throw err;

                // Resize image to have a maxium dimension of 60%
                image.scaleToFit(2048, 1024 * 0.60);

                // Calculate coordinates to center image
                const x = Math.floor((frame.bitmap.width - image.bitmap.width) / 2);
                const y = Math.floor((frame.bitmap.height - image.bitmap.height) / 2);

                // Compostite image onto the frame
                frame.composite(image, x, y)

                    // Write the final image to file for debugging
                    .write("tweet-img.jpg")
                    // Convert recordImageUrl to base64 for tweeting
                    .getBase64(Jimp.MIME_JPEG, (err, base64ImageString) => {
                        // Resolve it
                        resolve(base64ImageString)
                    })
            });
        });

    })
}

// Run instantly
// Turn on only for debugging as Heroku seems to like pinging this
// tweetRandomEphemera();

// TODO: Check Airtable for new record, 8am daily. Then tweet any new records
// schedule.scheduleJob("0 8 * * *", function () {
//     checkAndTweetNewEphemera();
// });

// TODO: fork Airtable function to produce random tweet (keep old random tweet generator)
// Throwback Thursday
// Tweet every Thursday morning at 8am
// schedule.scheduleJob("0 8 * * THU", function () {
//     tweetRandomEphemera();
// })
// Until then...
// Run every day at 8am
// Syntax: http://www.cronmaker.com/
schedule.scheduleJob("0 8 * * *", function () {
    tweetRandomEphemera();
});
