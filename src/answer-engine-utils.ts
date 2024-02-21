import { Msg, type Prompt } from '@dexaai/dexter'

import * as db from './db.js'
import type * as types from './types.js'

/**
 * Resolves all of the bot-related messages from a twitter thread, starting
 * from a leaf tweet, and traversing its parents – including any previous bot
 * mentions and responses. Returns the thread in a format compatible with the
 * OpenAI chat-completions API.
 */
export async function resolveMessageThread(
  message: types.Message,
  ctx: types.Context,
  {
    resolvePrevTweetsInThread = true
  }: {
    resolvePrevTweetsInThread?: boolean
  } = {}
): Promise<Prompt.Msg[]> {
  const prevTweetsInThread: types.Tweet[] = []
  const leafMessage = message
  let messages: types.Message[] = [message]

  // Resolve all previous bot-related messages in the thread
  do {
    if (!message.parentMessageId) break

    const parentMessage = await db.messages.get(message.parentMessageId)
    if (!parentMessage) break

    message = parentMessage
    messages.push(message)
  } while (true)

  // Resolve any previous non-bot-related tweets in the thread
  if (resolvePrevTweetsInThread) {
    let tweet = await db.tryGetTweetById(message.promptTweetId, ctx, {
      force: true
    })
    while (tweet) {
      const repliedToTweetRef = tweet.referenced_tweets?.find(
        (t) => t.type === 'replied_to'
      )
      if (!repliedToTweetRef) break

      const repliedToTweet = await db.tryGetTweetById(
        repliedToTweetRef.id,
        ctx,
        {
          force: true
        }
      )
      if (!repliedToTweet) break

      tweet = repliedToTweet
      prevTweetsInThread.push(tweet)
    }
  }

  // Reverse the messages so the oldest ones are first
  messages.reverse()
  prevTweetsInThread.reverse()

  // console.log('messages', messages)
  // console.log('prevTweetsInThread', prevTweetsInThread)

  // Filter any messages which have errors, unless it's the latest message we're
  // currently trying to resolve (which may have previously encountered an error
  // that we're currently retrying to process)
  messages = messages.filter((m) => !m.error || m === leafMessage)

  const chatMessagesForPrevTweets = prevTweetsInThread.map<Prompt.Msg>(
    (tweet) =>
      // TODO: sanitize this tweet text to handle t.co links and @mentions
      // TODO: unfurl quote tweets and retweets which likely have valuable
      // context
      Msg.user(tweet.text)
  )

  const chatMessagesForBotMessages = messages.flatMap<Prompt.Msg>((message) =>
    [
      Msg.user(message.prompt),
      message.response && message !== leafMessage
        ? Msg.assistant(message.response!)
        : null
    ].filter(Boolean)
  )

  return chatMessagesForPrevTweets.concat(chatMessagesForBotMessages)
}