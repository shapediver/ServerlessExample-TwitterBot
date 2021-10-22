import { TweetV2, TweetV2SingleResult, TwitterApi } from 'twitter-api-v2'
import { asyncForEach } from '../util/utils';
import { config } from '../../config'

const twitterClient = new TwitterApi(config.twitter);

export interface ITweet {
    id: string
    text: string
    imageUrl: string
}

const getTweetImageUrl = (tweet: TweetV2SingleResult) : string | null => {
    if (tweet.includes?.media?.length > 0) {
        return tweet.includes.media.find(t => t.url)?.url
    }
    return null
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

        const imageUrl = getTweetImageUrl(tweet)
        if (imageUrl) {
            foundTweets.push({
                id: t.id,
                text: tweet.data.text,
                imageUrl: imageUrl
            })
        }

    })
    
    return foundTweets
}
