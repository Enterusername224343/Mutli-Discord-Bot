import {
  Client,
  Collection,
  GatewayIntentBits as GIB,
  Partials,
  Routes,
  REST,
  DiscordjsErrorCodes,
} from "discord.js";
import fs from "fs/promises";
import { createRequire, isBuiltin } from "node:module";
import logger from "./utils/logger.mjs";
import {
  Level,
  Database,
  EmbedBuilder,
  Economy,
  GiveawaysManager,
  VoiceMaster,
} from "./utils/index.mjs";
import globalConfig from "../Assets/Global/config.mjs";
import "./utils/extenders/index.mjs";
import "./utils/extenders/replaceEmoji.mjs";
import * as Themes from "../Assets/Global/Themes.mjs";

const cache = new Map();
const require = createRequire(import.meta.url);

//? base discord-bot client

class Bot extends Client {
  /** @param {import('../Assets/Global/clientConfig.mjs').clientConfig} config */
  constructor(config) {
    super({
      allowedMentions: {
        parse: ["roles", "users", "everyone"],
        repliedUser: false,
      },
      intents: Object.keys(GIB),
      partials: Object.keys(Partials),
    });

    this.config = config;
  }

  async start() {
    try {
      this.db = await new Database(this.config.CLIENT_ID).LoadModels();
      await this.configManagar();

      const { config } = this;

      ["events", "aliases", "buttons", "cooldowns", "slashCommands"].forEach(
        (i) => (this[i] = new Collection())
      );

      /**@type {Collection<String, import('./utils/Command.mjs').prefix>} */
      this.commands = new Collection();
      this.categories = new Collection();

      config.Commands.Enabled.length > 0
        ? config.Commands.Enabled.forEach((c) => {
            this.categories.set(c, []);
          })
        : globalConfig.Commands.Categories.forEach((c) =>
            this.categories.set(c, [])
          );

      if (config.Commands?.Disabled?.length)
        config.Commands.Disabled.forEach((c) => this.categories.delete(c));

      await this._loadEvents();

      await this.login(config.TOKEN);

      if (!config.CLIENT_ID) this.config.CLIENT_ID = this.application.id;

      this.voiceMaster = new VoiceMaster(this);
      this.lvl = new Level(this);
      this.eco = new Economy(this);

      await this.loadCommands();

    } catch (e) {
      logger(e, "error");
    }
  }

  async reLoad() {
    await this.destroy();
    await this.start();
  }

  async configManagar() {
    const Model = "BotConfig";
    let botConfig = await this.db.FindOne(Model, {});

    if (!botConfig) {
      await this.db.Create(Model);
      botConfig = await this.db.FindOne(Model, {});
    }

    const { createdAt, updatedAt, __v, _id, ...cleanResult } =
      botConfig.toJSON();

    const config = {
      ...this.config,
      ...cleanResult,
    };

    const Theme = Themes?.[botConfig.Theme];

    this.theme = config.Theme;
    this.embed = Theme.embed ?? Themes.default.embed;
    this.emotes = Theme.emotes ?? Themes.default.emotes;

    this.config = config;

    return config;
  }

  /**
   *
   * @param {import("../Assets/Global/clientConfig.mjs").clientConfig} query
   * @returns
   */
  async configUpdate(query) {
    const Model = "BotConfig";
    const botConfig = await this.db.UpdateOne(Model, {}, query, {
      new: true,
      upsert: true,
      projection: { _id: 0, __v: 0 },
    });
    const { __v, _id, createdAt, updatedAt, ...cleanResult } = botConfig;

    this.config = {
      ...this.config,
      ...cleanResult,
    };

    if (Object.keys(query).includes("Theme")) {
      const Theme = Themes?.[query[`Theme`]];

      this.theme = query.Theme;
      this.embed = Theme.embed ?? Themes.default.embed;
      this.emotes = Theme.emotes ?? Themes.default.emotes;
    }

    this.application.edit();

    return this.config;
  }

  async _loadEvents() {
    const events = await this.getEvets();

    for await (const event of events) {
      this.events.set(event.name, event);
      if (event.customEvent) return event.run(this);

      if (event.runOnce)
        this.once(
          event.name,
          async (...args) => await event.run(this, ...args)
        );
      else
        this.on(event.name, async (...args) => await event.run(this, ...args));
    }
  }

  async loadCommands() {
    /**@type {Collection} */
    const cat = this.categories;
    const TOKEN = this.config.TOKEN;
    const CLIENT_ID = this.config.CLIENT_ID;
    const rest = new REST({ version: "9" }).setToken(TOKEN);
    const slashCommands = [];

    let prefixCount = 0;

    /**@type {import('./utils/Command.mjs').interaction[]} */
    const slashCmds = await this.getCommands("Slash");
    const prefixCmds = await this.getCommands("Prefix");

    slashCmds.forEach((cmd) => {
      if (cat.get(cmd?.category)) {
        cat.get(cmd.category).push(cmd);
        this.slashCommands.set(cmd.data.name, cmd);
        slashCommands.push(cmd.data);
      }
    });

    await this.application.commands.set(slashCommands);
    // await rest.put(
    //     Routes.applicationCommands(CLIENT_ID), {
    //     body: slashCommands
    // });

    //* ======== Message Commands

    prefixCmds.forEach((prefixCommand) => {
      if (!cat.get(prefixCommand?.category)) return;
      if (prefixCommand.name) {
        prefixCount++;
        if (Array.isArray(prefixCommand.name)) {
          for (const name of prefixCommand.name) {
            const clonedCommand = JSON.parse(JSON.stringify(prefixCommand));
            cat.get(prefixCommand?.category).push(clonedCommand);
            this.commands.set(name, clonedCommand);
            clonedCommand.name = name;
            clonedCommand.description = clonedCommand.description.replace(
              "{commandName}",
              name
            );
            clonedCommand.run = prefixCommand.run;
          }
        } else {
          this.commands.set(prefixCommand.name, prefixCommand);
          cat.get(prefixCommand?.category).push(prefixCommand);
        }
      } else
        logger(
          Error`Prefix Command Error: ${
            prefixCommand.name || file.split(".mjs")[0] || "Missing Name"
          } - ${this.user.username}`,
          "error"
        );

      // aliases
      if (prefixCommand.aliases && Array.isArray(prefixCommand.aliases))
        prefixCommand.aliases.forEach((messageCommandAlias) => {
          this.aliases.set(prefixCommand, prefixCommand.name);
        });
    });

    logger(
      `Loaded ` +
        `${slashCommands.length}/${slashCmds.length}`.bold +
        ` Slash & ` +
        `${prefixCount}/${prefixCmds.length}`.bold +
        ` Prefix Commands for ${this.user.username}`
    );
  }

  /**
   * @param {"Slash" | "Prefix"} type
   * @returns {Promise<Array>}
   */
  async getCommands(type) {
    const key = type;
    const cmds = cache.get(key);
    if (cmds) return cmds;

    const commands = [];

    if (type === "Slash") {
      try {
        const dirs = await fs.readdir("./Commands/Slash");

        for (const dir of dirs) {
          const files = await fs.readdir(`./Commands/Slash/${dir}/`);
          for (const file of files) {
            const { default: slashCommandData } = await import(
              `../Commands/Slash/${dir}/${file}`
            );
            commands.push(slashCommandData);
          }
        }
      } catch (error) {
        logger(error, "error");
      }
    } else {
      const dirs = await fs.readdir("./Commands/Prefix");

      for (const dir of dirs) {
        const files = (await fs.readdir(`./Commands/Prefix/${dir}/`)).filter(
          (file) => file.endsWith(".mjs")
        );

        for (const file of files) {
          const { default: prefixCommand } = await import(
            "../Commands/Prefix/" + dir + "/" + file
          );
          if (prefixCommand && !prefixCommand?.ignore)
            commands.push(prefixCommand);
        }
      }
    }

    cache.set(key, commands, 10);
    return commands;
  }

  /** @returns {Promise<Array<{name:string, run:Function}>>} */
  async getEvets() {
    const events = [];
    const key = "Events";
    const cacheEve = await cache.get(key);

    if (cacheEve) return cacheEve;

    const _events = await fs.readdir(`./src/events`);

    for (const event of _events) {
      const stat = await fs.stat(`./src/events/${event}`);

      if (stat.isDirectory()) {
        const EventsDir = await fs.readdir(`./src/events/${event}`);

        EventsDir.filter((i) => i.endsWith(".mjs")).forEach(
          async (finalEvent) => {
            const { default: clientEvent } = await import(
              `./events/${event}/${finalEvent}`
            );
            if (!clientEvent?.ignore && clientEvent.name && clientEvent.run)
              events.push(clientEvent);
          }
        );
      } else {
        const { default: clientEvent } = await import(`./events/${event}`);
        if (clientEvent?.ignore || !clientEvent.name || !clientEvent.run)
          return;
        events.push(clientEvent);
      }
    }

    cache.set(key, events, 10);
    return events;
  }

  getPromotion() {
    return {
      Message:
        globalConfig?.Promotion?.Messages[
          ~~(Math.random() * globalConfig.Promotion.Messages.length)
        ], // ~~ works same as Math.floor
    };
  }
  /** @returns {String} Bot invite URL*/
  getInvite() {
    return this.generateInvite({
      scopes: ["bot", "applications.commands"],
      permissions: [
        "AddReactions",
        "AttachFiles",
        "BanMembers",
        "ChangeNickname",
        "Connect",
        "DeafenMembers",
        "EmbedLinks",
        "KickMembers",
        "ManageChannels",
        "ManageGuild",
        "ManageMessages",
        "ManageNicknames",
        "ManageRoles",
        "ModerateMembers",
        "MoveMembers",
        "MuteMembers",
        "PrioritySpeaker",
        "ReadMessageHistory",
        "SendMessages",
        "SendMessagesInThreads",
        "Speak",
        "ViewChannel",
      ],
    });
  }
}

export default Bot;

/**
 * @author uo1428
 * @support .gg/uoaio | youtobe.com/u/uoaio
 * @donate patreon.com/uoaio
 * @note Dont take any type credit
 * @copyright discord.com/users/uoaio all rights reserved
 */
