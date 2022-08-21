// Get env variables up and running
require("dotenv").config();

// Allow for scheduling tweets
const schedule = require("node-schedule");
// Prepare for automatic Netlify builds at the same time as tweeting
const rebuild_url = process.env.NETLIFY_REBUILD_URL

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
// Has parameter to control how many bits of ephemera at a time,
// with the default value set 6
function tweetLatestEphemera(itemLimit = 6) {
    console.log("🎬 Checking Airtable for new ephemera")
    // Prepare array
    const notYetTweetedEphemera = []

    base(table).select({
        view: "Grid",
        filterByFormula: "({hidden}= '')", // Only show items that are not hidden
        sort: [{ field: "date", direction: "desc" }], // Search by newest to oldest to ensure newest items are picked up (reversed later)
    }).eachPage(function page(records, fetchNextPage) {
        // This function (`page`) will get called for each page of records.
        records.forEach(function (record) {
            // If this record does not have its 'tweeted' checkbox checked...
            if (!record.fields.tweeted) {
                console.log(`✨ New ephemera available for tweeting: ${record.fields.name}`)

                // Prepare for updating Airtable
                // Airtable's API wants these records formatted in a very particular way
                const recordObject = {}
                recordObject["id"] = record.id
                recordObject["fields"] = record.fields
                // Push to array used for both tweeting and later updating so it isn't tweeted again
                notYetTweetedEphemera.push(recordObject)
            }
        });
        fetchNextPage();

    }, function done(err) {
        if (err) throw err;
        console.log("🔵 Finished checking Airtable")
        // If there are new items...
        if (notYetTweetedEphemera.length) {
            // Reverse array so oldest items get tweeted first
            oldestToNewest = notYetTweetedEphemera.reverse()
            console.log(`🔪 Only tweeting out the oldest ${itemLimit} item(s) as per your request`)
            // Trim array to limit
            trimmedListTwoTweet = oldestToNewest.slice(0, itemLimit);

            // Go through the list of items (with a gap of 20 seconds),
            // ...kicking off a tweet for each
            for (let i = 0; i < trimmedListTwoTweet.length; i++) {
                (function (i) {
                    setTimeout(function () {
                        const recordObject = trimmedListTwoTweet[i]
                        // Kick off the tweet
                        kickOffTweet(recordObject, false)
                        console.log("🐦 Now initiating tweet for:", recordObject.fields.name)
                    }, 20000 * i);
                })(i);

                // Flick the 'tweeted' switch on to true now that tweet(s) have been kicked off
                // Note that this assumes kickOffTweet() will succeed
                trimmedListTwoTweet.map(i => {
                    i.fields.tweeted = true
                })

                // Update Airtable base records accordingly
                base('Main').update(trimmedListTwoTweet, function (err, records) {
                    if (err) throw err;
                });
            }
        } else {
            console.log("✅ Now new items to tweet")
            // Exit from Node with success code
            // https://nodejs.dev/en/learn/how-to-exit-from-a-nodejs-program
            process.exit(0)
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
        fetchNextPage();

    }, function done(err) {
        if (err) throw err;
        console.log("✅ Finished checking Airtable")
        // Select a random record for tweeting
        const record = allRecords[Math.floor(Math.random() * allRecords.length)];
        // Kick off the tweet
        // kickOffTweet(record, true)
    });
}

function kickOffTweet(record, isThrowback) {
    // Deploy to Netlify via build hook
    console.log("🌐 Now initiating Netlify deploy of https://ephemera.fyi for:", record.fields.name)
    fetch(rebuild_url, { method: 'POST' })

    // Then prepare tweet
    // Prepare record text with throwback text true
    const recordText = prepareText(record, isThrowback)

    // Prepare image
    prepareImage(record)
        .then((value) => {
            // Trim off extraneous bits that Jimp adds to base64
            const recordImage = value.substring(23, value.length)
            // Tweet it
            tweetIt(recordText, recordImage)
        })
}

// Function for sending out tweet
function tweetIt(tweetText, tweetImage) {
    // Upload image
    T.post('media/upload', { media_data: tweetImage }, uploaded);

    // Once image is uploaded on Twitter
    function uploaded(err, data, response) {
        if (err) throw err;
        // Prepare tweet content
        const tweetContent = {
            "status": tweetText,
            // Put Twitter's image ID into an array
            "media_ids": new Array(data.media_id_string),
            // TODO: get alt_text to work
            // Mention @get_altText on tweets to debug
            // "media_id": `${data.media_id_string}`,
            // "alt_text": { "text": "A scanned piece of physical ephemera" }
        }

        // Tweet it!
        T.post('statuses/update', tweetContent, onTweeted);
    }

    // After the tweet has been sent...
    function onTweeted(err, reply) {
        if (err !== undefined) {
            console.log(err)
            // Exit from Node with error
            process.exit(1);
        } else {
            console.log('🟢 Successfully tweeted: ' + reply.text)
            // Exit from Node with success code
            // https://nodejs.dev/en/learn/how-to-exit-from-a-nodejs-program
            process.exit(0);
        }
    }
}

// Function for preparing tweet text
function prepareText(record, isThrowback) {
    const recordName = record.fields.name;
    const recordDate = record.fields.date;
    // Format date so it can be programmatically changed a few lines below
    // Pass through the year, month, and day
    const recordDateStructured = new Date(recordDate.substring(0, 4), (recordDate.substring(5, 7) - 1), recordDate.substring(8, 10));
    // Use this to create a readable date format
    const recordDateHuman = recordDateStructured.toLocaleString("default", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    const recordLocation = record.fields.location;
    const recordCountry = record.fields.country;
    const recordLocationAndCountry = `${recordLocation}, ${recordCountry}`
    const recordTags = record.fields.tags;
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
    const imageDirectory = "https://res.cloudinary.com/dannywhite/image/upload/q_auto,f_auto,w_2048/ephemera/"
    const imageSlug = record.fields.imageSlug
    const imageUrl = imageDirectory + imageSlug

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

                // Composite image onto the frame
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
tweetLatestEphemera(1)

// Throwback Thursday
// Tweet every Thursday morning at 8AM GMT (6pm AEST, 7PM AEDT, 3AM EST, 12AM PST)
// schedule.scheduleJob("0 8 * * THU", function () {
//     tweetThursdayRandomEphemera()
// })

// Latest ephemera
// Checks for and tweets new Airtable records twice a day
// Run daily at 8AM GMT (6PM AEST, 7PM AEDT, 3AM EST, 12AM PST)
// Post a maximum of one ephemera item
// schedule.scheduleJob("0 8 * * *", function () {
//     tweetLatestEphemera(1)
// });
// Run daily at 8PM GMT (6AM AEST, 7AM AEDT, 3PM EST, 12PM PST)
// Post a maximum of one ephemera item
schedule.scheduleJob("0 20 * * *", function () {
    tweetLatestEphemera(1)
});
