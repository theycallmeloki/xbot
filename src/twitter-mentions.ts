import * as db from './db.js'
import * as twitter from './twitter.js'
import type * as types from './types.js'
import { BotError } from './bot-error.js'
import { handleKnownTwitterErrors, maxTwitterId } from './twitter-utils.js'

/**
 * Fetches the latest mentions of the given `userId` on Twitter.
 *
 * NOTE: even with pagination, **only the 800 most recent Tweets can be retrieved**.
 *
 * @see https://developer.twitter.com/en/docs/twitter-api/tweets/timelines/api-reference/get-users-id-mentions
 */
export async function getTwitterUserIdMentions(
  userId: string,
  opts: types.TwitterUserIdMentionsQueryOptions,
  ctx: types.Context
): Promise<types.TweetMentionFetchResult> {
  const originalSinceMentionId = opts.since_id

  let result: types.TweetMentionFetchResult = {
    mentions: [],
    users: {},
    tweets: {},
    sinceMentionId: originalSinceMentionId
  }

  if (!ctx.noCache) {
    const cachedResult = await db.getCachedUserMentionsForUserSince({
      userId,
      sinceMentionId: originalSinceMentionId || '0'
    })

    if (cachedResult?.mentions.length > 0) {
      result.mentions = result.mentions.concat(cachedResult.mentions)
      result.users = {
        ...cachedResult.users,
        ...result.users
      }
      result.tweets = {
        ...cachedResult.tweets,
        ...result.tweets
      }

      result.sinceMentionId = maxTwitterId(
        result.sinceMentionId,
        cachedResult.sinceMentionId
      )

      console.log('tweets.usersIdMentions CACHE HIT', {
        originalSinceMentionId,
        sinceMentionId: result.sinceMentionId,
        numMentions: result.mentions.length
      })
    } else {
      console.log('tweets.usersIdMentions CACHE MISS', {
        originalSinceMentionId
      })
    }
  }

  do {
    console.log('tweets.usersIdMentions', {
      sinceMentionId: result.sinceMentionId
    })

    try {
      await twitter.usersIdMentionsThrottleWorkaround()

      const mentionsQuery = twitter.usersIdMentions(
        userId,
        {
          ...opts,
          since_id: result.sinceMentionId
        },
        ctx
      )

      let numMentionsInQuery = 0
      let numPagesInQuery = 0

      for await (const page of mentionsQuery) {
        numPagesInQuery++

        if (page.data?.length) {
          numMentionsInQuery += page.data?.length
          result.mentions = result.mentions.concat(page.data)

          if (!ctx.noCache) {
            await db.upsertTweetMentionsForUserId(userId, page.data)
          }

          for (const mention of page.data) {
            result.sinceMentionId = maxTwitterId(
              result.sinceMentionId,
              mention.id
            )
          }
        }

        if (page.includes?.users?.length) {
          for (const user of page.includes.users) {
            result.users[user.id] = user
          }
        }

        if (page.includes?.tweets?.length) {
          for (const tweet of page.includes.tweets) {
            result.tweets[tweet.id] = tweet
          }
        }

        await twitter.usersIdMentionsThrottleWorkaround()
      }

      console.log({ numMentionsInQuery, numPagesInQuery })
      if (numMentionsInQuery < 5 || !ctx.resolveAllMentions) {
        break
      }
    } catch (err: any) {
      console.error(
        'twitter error fetching user mentions:',
        err.status || err.error?.detail || err.toString()
      )

      if (result.mentions.length) {
        break
      } else {
        handleKnownTwitterErrors(err, { label: 'fetching tweet mentions' })

        throw new BotError(
          `Error fetching twitter user mentions: ${err.message}`,
          {
            type: 'twitter:unknown',
            cause: err
          }
        )
      }
    }
  } while (true)

  await db.upsertTweets(Object.values(result.tweets))
  await db.upsertTwitterUsers(Object.values(result.users))

  return result
}