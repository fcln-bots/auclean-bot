const hasEntityUrl = entities =>
  entities?.some(({ type }) => type === 'url' || type === 'text_link') ?? false

const hasInlineKeyboardUrl = markup =>
  markup?.inline_keyboard?.some(row =>
    row.some(button => Boolean(button.url || button.login_url?.url))
  ) ?? false

const hasUrl = message =>
  hasEntityUrl(message.entities) ||
  hasEntityUrl(message.caption_entities) ||
  hasInlineKeyboardUrl(message.reply_markup)

const isReplyToHuman = message =>
  message.reply_to_message?.from?.is_bot === false

// anonymous admins and channels arrive as GroupAnonymousBot / Channel_Bot
// (is_bot: true) with sender_chat set, they are not bots
const isBotAd = message =>
  message.from?.is_bot === true &&
  !message.sender_chat &&
  hasUrl(message) &&
  !isReplyToHuman(message)

async function checkSetup({ bot, logger }) {
  try {
    const me = await bot.getMe()

    logger.info(`bot ad cleaner: running as @${me.username}`)

    if (me.can_read_all_group_messages !== true) {
      logger.warn(
        'bot ad cleaner: privacy mode is on, bot gets all group messages only where it is an administrator'
      )
    }

    logger.info(
      'bot ad cleaner: bot-to-bot communication mode can not be checked via Bot API, ' +
      'enable it in @BotFather and test with a message of another bot in a group'
    )
  } catch (e) {
    logger.error(`bot ad cleaner: startup checks failed: ${e.message}`)
  }
}

function setupBotAdCleaner({ bot, logger }) {
  bot.on('message', async message => {
    if (!isBotAd(message)) {
      return
    }

    logger.info(`bot ad cleaner: deleting message ${message.message_id} in chat ${message.chat.id}`)

    try {
      await bot.deleteMessage(message.chat.id, message.message_id)
    } catch (e) {
      logger.error(`bot ad cleaner: can't delete message ${message.message_id} in chat ${message.chat.id}: ${e.message}`)
    }
  })

  checkSetup({ bot, logger })
}

module.exports = { setupBotAdCleaner, isBotAd }
