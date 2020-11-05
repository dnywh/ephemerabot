// Get env variables up and running
require("dotenv").config();

// Allow for reading and writing ephemera records
const fs = require("fs");
// Prepare file
const filePath = "previouslyTweetedEphemera.json"

// Allow for scheduling tweets
const schedule = require("node-schedule");

// Allow for image editing
const Jimp = require("jimp");

// Initiate Twit
const Twit = require("twit");
const T = new Twit({
    consumer_key: process.env.TWITTER_API_KEY,
    consumer_secret: process.env.TWITTER_API_SECRET_KEY,
    access_token: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_SECRET
});

// Get Airtable going
const base = require("airtable").base(process.env.AIRTABLE_BASE_ID);
const table = "Main";


// Functions

// Function for tweeting any new ephemera
function tweetLatestEphemera() {
    console.log("🎬 Checking Airtable for new ephemera")
    // Prepare arrays
    const previouslyTweetedEphemera = []
    const notYetTweetedEphemera = []

    base(table).select({
        view: "Grid",
        filterByFormula: "({hidden}= '')", // Only show items that are not hidden
        sort: [{ field: "date", direction: "desc" }], // Search by newest to oldest to ensure newest items are picked up (reversed later)
    }).eachPage(function page(records, fetchNextPage) {
        // This function (`page`) will get called for each page of records.
        records.forEach(function (record) {
            // Check file if it already exists
            fs.readFile(filePath, (err, data) => {
                if (err) throw err;
                // Prepare past ephemera items
                const existingEphemera = JSON.parse(data)
                // Compare this record against past ephemera items
                if (existingEphemera.some(i => i.fields.name === record.fields.name)) {
                    // If so, it has alreay been tweeted
                    // console.log("Already a match. Must have been tweeted already")
                } else {
                    // If it doesn't exist, line it up to tweet
                    console.log(`✨ New ephemera to tweet: ${record.fields.name}`)
                    notYetTweetedEphemera.push(record)
                    return
                }
            });


            // Now that any missing ephemera has been lined up to tweet 
            previouslyTweetedEphemera.push(record)
        });

        // To fetch the next page of records, call `fetchNextPage`.
        // If there are more records, `page` will get called again.
        // If there are no more records, `done` will get called.
        fetchNextPage();

    }, function done(err) {
        if (err) { console.error(err); return; }
        console.log("✅ Finished checking Airtable")

        // If there are new items...
        if (notYetTweetedEphemera.length) {
            // Reverse array so oldest items get tweeted first
            oldestToNewest = notYetTweetedEphemera.reverse()

            // Go through each item
            // With a 20 second gap between each
            // And tweet it out
            for (let i = 0; i < oldestToNewest.length; i++) {
                (function (i) {
                    setTimeout(function () {
                        const record = oldestToNewest[i]
                        // Kick off the tweet
                        kickOffTweet(record)
                    }, 20000 * i);
                })(i);
            }

            // Format and write all ephemera to file
            // So they don't get tweeted in this function again
            const previouslyTweetedEphemeraFormatted = JSON.stringify(previouslyTweetedEphemera, null, 4);
            fs.writeFile(filePath, previouslyTweetedEphemeraFormatted, (err) => {
                if (err) throw err;
                // Confirm file save
                console.log(`File '✅ ${filePath}' has been saved with the queued ephemera`);
            });
        } else {
            console.log("✅ Now new items to tweet")
        }
    });
}

// Function for tweeting a random Throwback Thursday ephemera item
function tweetThursdayRandomEphemera() {
    console.log("🎬 Scouring Airtable for a random piece of ephemera")

    // Prepare array for all records
    const allRecords = []

    base(table).select({
        view: "Grid",
        filterByFormula: "({hidden}= '')", // Only show items that are not hidden
        sort: [{ field: "date", direction: "desc" }], // Sort by newest-first just for debugging (has no effect on random)
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
        console.log("✅ Finished checking Airtable")
        // Select a random record for tweeting
        const record = allRecords[Math.floor(Math.random() * allRecords.length)];
        // Kick off the tweet
        kickOffTweet(record)
    });
}

function kickOffTweet(record) {
    console.log("⏳ Now beginning to tweet...")
    // Prepare record text with throwback text true
    const recordText = prepareText(record, true)

    // Prepare image
    prepareImage(record)
        .then((value) => {
            // Trim off extraenous bits that Jimp adds to base64
            const recordImage = value.substring(23, value.length)
            // Tweet it
            tweetIt(recordText, recordImage)
        })
}

// Function for seding out tweet
function tweetIt(tweetText, tweetImage) {
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
            console.log('🐦 Tweeted: ' + reply.text)
        }
    }
}

// Function for preparing tweet text
function prepareText(record, isThrowback) {
    const recordName = record.get("name");
    const recordDate = record.get("date");
    // Format date so it can be programatically changed a few lines below
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
    const throwbackString =
        `Throwback Thursday:\n\n${recordString}`

    if (isThrowback) {
        return throwbackString
    } else {
        return recordString
    }
}

// Function for preparing tweet image
function prepareImage(record) {
    const imageUrl = record.get("images")[0].url

    return new Promise((resolve, reject) => {
        // Create the white frame
        // Set to 2048x1024 to match Twitter's preferred 1024x512 ratio
        new Jimp(2048, 1024, '#FFFFFF', (err, frame) => {
            if (err) throw err;

            // Then read the ephemera image
            Jimp.read(imageUrl, (err, image) => {
                if (err) throw err;

                // Scale image to have horizontal and vertical padding
                image.scaleToFit(2048 * 0.8, 1024 * 0.65);

                // Calculate coordinates to center image
                const x = Math.floor((frame.bitmap.width - image.bitmap.width) / 2);
                const y = Math.floor((frame.bitmap.height - image.bitmap.height) / 2);

                // Compostite image onto the frame
                frame.composite(image, x, y)

                    // Write the final image to file for debugging
                    .write("tweet-img.jpg")
                    // Convert image file to base64 for tweeting
                    .getBase64(Jimp.MIME_JPEG, (err, base64ImageString) => {
                        // Resolve it
                        resolve(base64ImageString)
                    })
            });
        });

    })
}


// Call main functions

// Instant functions for debugging only
// tweetThursdayRandomEphemera()
// tweetLatestEphemera()

// Throwback Thursday
// Tweet every Thursday morning at 8am GMT (6pm AEST, 7pm AEDT, 3am EST, midnight PST)
schedule.scheduleJob("0 8 * * THU", function () {
    tweetThursdayRandomEphemera()
})

// Latest ephemera
// Checks for and tweets new Airtable records
// Run daily at 8am GMT (6pm AEST, 7pm AEDT, 3am EST, midnight PST)
// Syntax: http://www.cronmaker.com/
schedule.scheduleJob("0 8 * * *", function () {
    tweetLatestEphemera()
});
