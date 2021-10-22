import 'source-map-support/register';
import { Context, EventBridgeEvent } from 'aws-lambda';
import { fetchTweets } from '../twitter/twitter';
import { runModel } from '../geometry-backend/modelutil';
import { config } from '../../config'

interface IResult {
  success: boolean
  error?: Error
}

const search = "shapediver"

export const process = async (event : EventBridgeEvent<string, any>, _context : Context) : Promise<IResult> => {
  
  try {

    console.debug('Event: ', JSON.stringify(event))

    const tweets = await fetchTweets(search)
    console.log(`Fetched ${tweets.length} ${search} tweets`, tweets)

    if (tweets.length === 0) {
      console.log("No tweets")
      return {
        success: true,
      }
    }

    const response = await runModel(tweets[0], config.shapediver)
    console.debug('Response: ', JSON.stringify(response, null, 2))
    
    return {
      success: true,
    }

  } catch (e) {

    console.error('Exception: ', e)
   
    return {
      success: false,
      error: e,
    }

  }

}
