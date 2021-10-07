import { TweetV2, TwitterApi } from 'twitter-api-v2'
import { asyncForEach } from '../util/utils';
import { config } from '../../config'

const twitterClient = new TwitterApi(config.twitter);

export interface ITweet {
    id: string
    text: string
    imageUrl: string
}

export const fetchTweets = async (search : string) : Promise<ITweet[]> => {
    
    const searchResults = await twitterClient.v2.search(search)
    if (searchResults.data.meta.result_count === 0) {
        return []
    }

    const foundTweets = [];
    await asyncForEach(searchResults.data.data, async (t : TweetV2) : Promise<void> => {
        
        const tweet = await twitterClient.v2.singleTweet(t.id, {
            "media.fields": "url",
            "expansions": "attachments.media_keys",
        })

        if (tweet.includes && tweet.includes.media) {
            foundTweets.push({
                id: t.id,
                text: tweet.data.text,
                imageUrl: tweet.includes?.media[0].url
            })
        }

    })
    
    return foundTweets
}
