import { EchoBot } from './bots/echo.bot';
import { IgnoreBot } from './bots/ignore.bot';
import { ReverseBot } from './bots/reverse.bot';
import { SpamBot } from './bots/spam.bot';

export const BOT_TOKEN = 'BOTS';
export const USER_REPOSITORY = 'USER_REPOSITORY';
export const MESSAGE_REPOSITORY = 'MESSAGE_REPOSITORY';

export const BOTS = [EchoBot, ReverseBot, IgnoreBot, SpamBot];
