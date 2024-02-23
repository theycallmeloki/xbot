import type * as types from '../src/types.js'
import { createAnswerEngine } from '../src/answer-engine-utils.js'
import { resolveCLIArgs } from '../src/cli-utils.js'
import { openaiClient } from '../src/openai-client.js'
import { respondToNewMentions } from '../src/respond-to-new-mentions.js'
import { getTwitterClient } from '../src/twitter-client.js'
import { assert } from '../src/utils.js'

/**
 * Generates test data for testing an answer engine for a given tweet.
 *
 * ```sh
 * tsx bin/debug-answer-engine.ts -t '1760384146004996333'
 * ```
 */
async function main() {
  const argv = resolveCLIArgs({
    name: 'debug-answer-engine',
    forceReply: true
  })

  if (!argv.flags.debugTweetIds.length) {
    console.log('Must provide at least one tweet id to debug via -t <tweet-id>')
    argv.showHelp()
    process.exit(1)
  }

  if (argv.flags.debugTweetIds.length > 1) {
    console.log(
      'This script only supports debugging a single tweet via -t <tweet-id>'
    )
    argv.showHelp()
    process.exit(1)
  }

  const answerEngine = createAnswerEngine(
    argv.flags.answerEngine as types.AnswerEngineType
  )

  let twitterClient = await getTwitterClient()
  const { data: twitterBotUsaer } = await twitterClient.users.findMyUser()
  const twitterBotUserId = twitterBotUsaer?.id

  if (!twitterBotUserId) {
    throw new Error('twitter error unable to fetch current user')
  }

  const ctx: types.Context = {
    // Dynamic a state which gets persisted to the db
    sinceMentionId: '0',

    // Services
    twitterClient,
    openaiClient,

    // This is the key field for this script which causes processing to return
    // before having the answer engine generates a response normally
    debugAnswerEngine: true,

    // Constant app runtime config
    debug: argv.flags.debug,
    dryRun: argv.flags.dryRun,
    noMentionsCache: argv.flags.noMentionsCache,
    earlyExit: argv.flags.earlyExit,
    forceReply: argv.flags.forceReply,
    resolveAllMentions: argv.flags.resolveAllMentions,
    maxNumMentionsToProcess: argv.flags.debugTweetIds.length,
    debugTweetIds: argv.flags.debugTweetIds,
    twitterBotHandle: `@${twitterBotUsaer.username}`,
    twitterBotHandleL: `@${twitterBotUsaer.username.toLowerCase()}`,
    twitterBotUserId,
    answerEngine
  }

  const batch = await respondToNewMentions(ctx)
  if (!batch.mentions.length) {
    throw new Error(
      `No valid mentions found for debug tweet ids: ${ctx.debugTweetIds?.join(
        ', '
      )}`
    )
  }

  const message = batch.messages[0]
  assert(message)
  assert(ctx.debugTweetIds!.includes(message.id))

  return answerEngine.resolveMessageThread(message, ctx)
}

main()
  .then((res) => {
    if (res) {
      console.log()
      console.log(JSON.stringify(res, null, 2))
    }

    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
