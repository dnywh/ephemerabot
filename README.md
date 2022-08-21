<img src="https://user-images.githubusercontent.com/3104761/97854065-12cc5380-1d4d-11eb-832d-8cbf3e8654f4.jpg" alt="A robot made up of ticket stubs, receipts, and other analogue bits and bobs" width="128">

# Ephemerabot

[Ephemerabot](https://twitter.com/ephemerabot) is a Twitter bot cousin of the [Ephemera](https://github.com/dnywh/ephemera) project. Ephemerabot checks for and [tweets out](https://twitter.com/ephemerabot) new scraps of ephemera daily. Any new ephemera also causes the [Ephemera website](https://ephemera.fyi) to rebuild using Netlify build hooks.

This repo might be useful to you if:

- You're interested in making a Twitter bot
- Your ideal Twitter bot reads and writes images
- You'd like to transform images via Node
- You're interested in using the Airtable API
- You're interested in automatically deploying Netlify sites

## Getting started

Here's how to get this project working locally.

### Prerequisites

- Node.js (v18 and above) and npm
- An Airtable base and API key ([instructions here](https://github.com/dnywh/ephemera#1-get-your-airtable-in-order))
- A Twitter developer account and API key

And if you'd like to make Ephemerabot automatically deploy you'll need to either:

- Prepare a Netlify site with a [build hook](https://docs.netlify.com/configure-builds/build-hooks/) URL
- Comment-out the `fetch(rebuild_url, { method: 'POST' })` line in _[server.js](https://github.com/dnywh/ephemerabot/blob/main/server.js)_

### Installation

1. Clone this repo

```sh
git clone https://github.com/dnywh/ephemerabot.git
```

2. Install the NPM packages

```sh
cd ephemerabot
npm install
```

3. Create a file called .env and enter values for the variables shown in [.env.example](https://github.com/dnywh/ephemerabot/blob/main/.env.example)

```
TWITTER_API_KEY=
TWITTER_API_SECRET_KEY=

TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_SECRET=

AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=

REBUILD_URL=
```

## Usage

Here's how to get Ephemerabot going, assuming you have followed the above instructions and have:

1. API keys for both Twitter and Airtable
2. An Airtable base set up similarly to mine ([instructions here](https://github.com/dnywh/ephemera#1-get-your-airtable-in-order))

### Running locally

```sh
npm start
```

Consider using one of the [two core functions](https://github.com/dnywh/ephemerabot/blob/main/server.js#L258) currently commented-out for debugging. Otherwise Ephemerabot will just wait for its scheduled time to post.

Ephemerabot loves to chat. Keep an eye on the terminal to see how things are progressing.

#### Tweeting latest ephemera

Ephemerabot looks at the _tweeted_ value of each record to see if it has been tweeted yet. Once tweeted, records have this value to `true`. The [aforementioned instructions](https://github.com/dnywh/ephemera#1-get-your-airtable-in-order) include an [example base](https://airtable.com/shr1HFbqpH0axgEb6/tbl689cjHdYYIM5ZA) with a _tweeted_ column. Try setting one or two records' _tweeted_ value to `false` to have them recognised and tweeted by the `tweetLatestEphemera()` function.

To use the `tweetLatestEphemera()` function in debug mode:

1. Make sure your connected Airtable base has at least one record with its _tweeted_ value set to `false`
2. Uncomment `tweetLatestEphemera()` in the _debugging_ section (at the bottom) of _[server.js](https://github.com/dnywh/ephemerabot/blob/main/server.js)_
3. If you just want to debug locally (and not kick off a real tweet): Comment-out `kickOffTweet(record, false)` within the main `tweetLatestEphemera() function`
4. Run `npm start`
5. Keep an eye on your console for the results

### Running externally

Running Node on your computer is the only way Ephemerabot lives, unless you deploy this app to a server. You'll need to sign up to a service such as Heroku to do so. Daniel Shiffman has [a](https://www.youtube.com/watch?v=Rz886HkV1j4) [few](https://www.youtube.com/watch?v=DwWPunpypNA) videos on this that are beginner-friendly.

Once you have set up a Heroku account and installed the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli):

1. Enter your API keys as _Config Vars_ inside your Heroku dashboard's _Settings_ page
2. Push your project to Heroku:

```sh
git push heroku main
```

#### Image hosting

To use your own images you'll need to use a service like Cloudinary and change the `imageDirectory` value in _[server.js](https://github.com/dnywh/ephemerabot/blob/main/server.js)_.
