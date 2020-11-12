<img src="https://user-images.githubusercontent.com/3104761/97854065-12cc5380-1d4d-11eb-832d-8cbf3e8654f4.jpg" alt="A robot made up of ticket stubs, receipts, and other analogue bits and bobs" width="128">

# Ephemerabot

[Ephemerabot](https://twitter.com/ephemerabot) is a Twitter bot cousin of the [Ephemera](https://github.com/dnywh/ephemera) project. Ephemerabot checks for and [tweets out](https://twitter.com/ephemerabot) new scraps of ephemera daily, and tweets out a Throwback Thursday edition every...Thursday.

This repo might be useful to you if:

- You're interested in making a Twitter bot
- Your ideal Twitter bot reads and writes images
- You'd like to transform images via Node
- You're interested in using the Airtable API

## Getting started

Here's how to get this project working locally.

### Prerequisites

- Node.js and npm
- An Airtable base and API key ([instructions here](https://github.com/dnywh/ephemera#1-get-your-airtable-in-order))
- A Twitter developer account and API key

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

3. Create a file called .env and enter values for the variables shown in [.env.example](https://github.com/dnywh/ephemerabot/blob/master/.env.example)

```
TWITTER_API_KEY=
TWITTER_API_SECRET_KEY=

TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_SECRET=

AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=
```

## Usage

Here's how to get Ephemerabot going, assuming you have followed the above instructions and have:

1. API keys for both Twitter and Airtable
2. An Airtable base set up similarly to mine ([instructions here](https://github.com/dnywh/ephemera#1-get-your-airtable-in-order))

### Running locally

```sh
npm start
```

Consider using one of the [two core functions](https://github.com/dnywh/ephemerabot/blob/master/server.js#L258) currently commented-out for debugging. Otherwise Ephemerabot will just wait for its scheduled time to post.

Ephemerabot loves to chat. Keep an eye on the terminal to see how things are progressing.

#### Tweeting latest ephemera

Ephemerabot compares _[previouslyTweetedEphemera.json](https://github.com/dnywh/ephemerabot/blob/master/previouslyTweetedEphemera.json)_ against Airtable's records to see which records haven't been tweeted out. They then tweet _all_ of these not-yet-tweeted records out. Consider filling _previouslyTweetedEphemera.json_ with most or all of Airtable's data before running. The easiest way to do this is to just comment-out the tweeting function, as the 'new' records will be added to the _previouslyTweetedEphemera.json_ regardless.

1. Navigate to _[server.js](https://github.com/dnywh/ephemerabot/blob/master/server.js)_ and find the `tweetLatestEphemera()` function
2. Find `kickOffTweet(record, false)` inside of this function
3. Comment it out
4. Call `tweetLatestEphemera()` at the bottom of the script
5. Run `npm start` only
6. Check that _previouslyTweetedEphemera.json_ has filled
7. Uncomment `kickOffTweet(record, false)`
8. Remove your `tweetLatestEphemera()` from the bottom of the script

Then remove a record or two from _previouslyTweetedEphemera.json_ before running `npm start` once more. That will leave you with only one or two records to tweet out (instead of hundreds).

### Running externally

Running Node on your computer is the only way Ephemerabot lives, unless you 'deploy' this app to a server. You'll need to sign up to a service such as Heroku to do so. Daniel Shiffman has [a](https://www.youtube.com/watch?v=Rz886HkV1j4) [few](https://www.youtube.com/watch?v=DwWPunpypNA) videos on this that I think are beginner-friendly.

Once you have set up a Heroku account and installed the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli):

1. Enter your API keys as _Config Vars_ inside your Heroku dashboard's _Settings_ page
2. Push your project to Heroku:

```sh
git push heroku main
```
