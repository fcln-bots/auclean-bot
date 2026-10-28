const TelegramBot = require('node-telegram-bot-api')
const dateFormat = require('dateformat')
const { setupBotAdCleaner } = require('./bot_ad_cleaner')

const token = process.env.TG_BOT_API_TOKEN

const bot = new TelegramBot(token, { polling: true })

class Logger {

  getTimeString() {
    return dateFormat(new Date(), "[yyyy-mm-dd h:MM:ss]")
  }

  info(text) {
    text.split("\n").forEach(string => console.log(`${this.getTimeString()}: ${string}`));
  }

  warn(text) {
    text.split("\n").forEach(string => console.warn(`${this.getTimeString()}: ${string}`));
  }

  error(text) {
    text.split("\n").forEach(string => console.error(`${this.getTimeString()}: ${string}`));
  }

}

const logger = new Logger()

class MessageCheker {

  constructor(msg) {
    this.msg = msg
  }

  isLinkInCaption() {
    return this.msg.caption_entities &&
      this.msg.caption_entities.some(obj => obj.type === 'text_link')
  }

  isSentViaBot() {
    return this.msg.via_bot
  }

}

class AudioCleaner {


  async resendAudio(msg) {
    logger.info("resending audio: " + msg.audio.title + ":" + msg.audio.performer)
    await bot.deleteMessage(msg.chat.id, msg.message_id)
      .catch(console.log)
    await bot.sendAudio(msg.chat.id, msg.audio.file_id)

  }

  handleMessage(msg) {
    logger.info("\n" + "got message in '" + msg.chat.title + "' from  " + msg.author_signature)

    if (!msg.audio) {
      return logger.info("it's not audio - skiping")
    }

    let mcheker = new MessageCheker(msg)
    console.debug(msg)

    let linkInCaption = mcheker.isLinkInCaption()

    if (linkInCaption) {
      logger.info("removing caption: " + msg.caption)
    }

    let viaBot = mcheker.isSentViaBot()

    if (viaBot) {
      logger.info("removing bot refernce: " + msg.via_bot.username)
    }

    if (linkInCaption || viaBot) {
      return this.resendAudio(msg)
    }

    logger.info("it's clear audio, nothing to do")

  }

}



async function main() {
  console.log("setting up bot")

  let acleaner = new AudioCleaner()

  bot.on("channel_post", acleaner.handleMessage.bind(acleaner))
  bot.on("message", acleaner.handleMessage.bind(acleaner))

  setupBotAdCleaner({ bot, logger })

  logger.info("started")
}

main()

