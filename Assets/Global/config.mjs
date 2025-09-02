import dotenv from "dotenv";
dotenv.config();

const cat = [
  "General",
  "Economy",
  "Fun",
  "Giveaway",
  "Misc",
  "Moderation",
  "Rank",
  "Setup",
  "OwnerOnly",
  "NSFW",
];

/**
 * @typedef {"OwnerOnly" |"General" | "NSFW" | "Moderation" | "Setup" | "Fun" | "Giveaway" | "Rank" | "Economy" | "Misc"} CategoryValue
 */

/**
 * @typedef {"Yellow" | "Blue" | "Red"} Themes Avaliable themes
 */

/**
 * @typedef { "Lock"| "UnLock" | "Hide" |  "UnHide" | "Rename" | "Mute" | "UnMute" |  "Disconnect" | "Delete" | "Ban" |  "Users" | "Permit"} JoinToCreateActions
 */

/**
 * @typedef {Object} API
 * @property {String} MongoDB
 */

/**
 * @typedef {Object} Log
 * @property {String} Command - Webhook URL
 * @property {String} Error - Webhook URL
 */

/**
 * @typedef {Object} GlobalConfig
 * @property {Log} Log
 * @property {Array<import("discord.js").Snowflake>} Owners
 * @property {Object} Commands
 * @property {Object} Promotion
 * @property {String[]} Promotion.Messages
 * @property {Object} Default
 * @property {import("discord.js").ActivitiesOptions} Default.Activity
 * @property {import("discord.js").PresenceStatusData} Default.Status
 * @property {String} Default.Prefix
 * @property {import("discord.js").Snowflake[]} Default.Owners
 * @property {Themes} Default.Theme
 * @property {Object} Default.Links
 * @property {String} Default.Links.Discord
 * @property {String} Default.Links.Invite
 * @property {String} Default.Links.Patreon
 * @property {Object} Default.Economy
 * @property {String} Default.Economy.Global
 * @property {Number} MaxClientOwners
 * @property {Object} Default.Commands
 * @property {CategoryValue[]} Default.Commands.Enabled - Enable Commands By categories. leave blank to enable all
 * @property {CategoryValue[]} Default.Commands.Disabled - Disable Commands By categories.
 * @property {API} API
 * @property {[]} Languages
 * @property {Themes[]} Themes
 * @property {Object} JoinToCreate
 * @property {JoinToCreateActions[]} JoinToCreate.Actions
 * @property {CategoryValue[]} Commands.Categories
 */

/**@type {GlobalConfig} */
export default {
  API: {
    MongoDB: process.env.MONGO_DB || "", // put in .env
  },

  // default config. it will store in db. You can change it once from here. Use bot-config command to update bot config
  Default: {
    Prefix: ".",

    //? enable/disable command by categories
    Commands: {
      Enabled: [],
      Disabled: [],
    },

    Links: {
      Discord: "https://discord.gg/___",
      Patreon: "https://patreon.com",
    },

    Status: "dnd",
    Activity: {
      name: "BeE Happy :)", // status
      type: 4,
    },

    Economy: {
      Global: true,
    },

    Owners: ["1276108947308417027"], // bot owner ids
    Theme: "Blue",
  },

  // webhooks logs of your bot
  Log: {
    Ready:
      "https://discord.com/api/webhooks/1198197920042848276/eKefN4rkaHn4ZpyssxYAsh7aKGcmMFTzMHUVS415zZzQQAqkbvzm79tUL_bAltDxkxE2",
    Command:
      "https://discord.com/api/webhooks/1198197920042848276/eKefN4rkaHn4ZpyssxYAsh7aKGcmMFTzMHUVS415zZzQQAqkbvzm79tUL_bAltDxkxE2",
    Error:
      "https://discord.com/api/webhooks/1198197920042848276/eKefN4rkaHn4ZpyssxYAsh7aKGcmMFTzMHUVS415zZzQQAqkbvzm79tUL_bAltDxkxE2",
  },

  Commands: {
    Categories: cat,
  },

  Promotion: {
    Messages: ["Join our [discord](https://discord.gg) "],
  },

  Languages: ["en", "de"],

  JoinToCreate: {
    // dont change anything
    Actions: [
      "Lock",
      "UnLock",
      "Hide",
      "UnHide",
      "Rename",
      "Mute",
      "UnMute",
      "Disconnect",
      "Delete",
      "Ban",
      "Users",
      "Permit",
    ],
  },

  Themes: ["Yellow", "Blue", "Red"],
  MaxClientOwners: 5, // limit to set owners per bot
};
