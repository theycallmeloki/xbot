// These are stored as case-insensitive, lowercase strings
export const twitterKnownBots = new Set<string>(
  [
    'threadreaderapp',
    'SaveToNotion',
    'ChatGPTBot',
    'AskDexa',
    'PingThread',
    'readwiseio',
    'threader',
    'unrollthread',
    'ReplyGPT',
    'ChatSonicAI',
    'dustyplaylist',
    'pikaso_me',
    'RemindMe_OfThis',
    'SaveMyVideo',
    'QuotedReplies',
    'poet_this',
    'MakeItAQuote',
    'colorize_bot',
    'DearAssistant',
    'WhatTheFare',
    'wayback_exe',
    'TayTweets',
    'deepquestionbot',
    'MoMARobot',
    'phasechase',
    'poem_exe',
    'desires_exe',
    'HundredZeros',
    'dscovr_epic',
    'MagicRealismBot',
    'MuseumBot',
    'TwoHeadlines',
    'pentametron',
    'earthquakebot',
    '_grammar_',
    'netflix_bot',
    'redbox_bot',
    'nicetipsbot',
    'the_ephemerides',
    'year_progress',
    'IFindPlanets',
    'emojimashupbot',
    'translatorbot',
    'MetaculusAlert',
    'hashtagify',
    'GooogleFactss',
    'Timer',
    'DownloaderBot',
    'QuakesToday',
    'Savevidbot',
    'Growthoid',
    'greatartbot',
    'Stupidcounter',
    'everyword',
    'fuckeveryword',
    'big_ben_clock',
    'LetKanyeFinish',
    'RedScareBot',
    'EnjoyTheFilm',
    'DBZNappa',
    'Exosaurs',
    'exoslash',
    'BloombrgNewsish',
    'AutoCharts',
    'HottestStartups',
    'metaphorminute',
    'unchartedatlas',
    'YesYoureRacist',
    'YesYoureSexist',
    'accidental575',
    'EarthRoverBot',
    'happened_today',
    'anagramatron',
    'pentametron',
    'stealthmountain',
    'SortingBot',
    'flycolony',
    'chernobylstatus',
    'blitz_bot_test',
    'unescobot',
    'wahlumfrageBot',
    'NeonaziWallets',
    'LatencyAt',
    'teololstoy',
    'trumpretruth',
    'UnrollHelper',
    'bot4thread'
  ].map((s) => s.toLowerCase())
)

export function isKnownTwitterBot(username: string) {
  return twitterKnownBots.has(username.toLowerCase())
}

export function isLikelyTwitterBot(username: string) {
  username = username.toLowerCase()

  if (isKnownTwitterBot(username)) return true
  if (/bot$/.test(username)) return true
  if (/gpt$/.test(username)) return true
  if (/status$/.test(username)) return true

  return false
}