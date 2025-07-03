import dotenv from "dotenv";
dotenv.config();

export const IGusername: string = process.env.IGusername || "default_IGusername";
export const IGpassword: string = process.env.IGpassword || "default_IGpassword";
export const Xusername: string = process.env.Xusername || "default_Xusername";
export const Xpassword: string = process.env.Xpassword || "default_Xpassword";

export const TWITTER_API_CREDENTIALS = {
  appKey: process.env.TWITTER_API_KEY || "default_TWITTER_API_KEY",
  appSecret: process.env.TWITTER_API_SECRET || "default_TWITTER_API_SECRET",
  accessToken: process.env.TWITTER_ACCESS_TOKEN || "default TWITTER_ACCESS_TOKEN",
  accessTokenSecret: process.env.TWITTER_ACCESS_SECRET || "default_TWITTER_ACCESS_SECRET",
  bearerToken: process.env.TWITTER_BEARER_TOKEN || "default_TWITTER_BEARER_TOKEN",
}



export const geminiApiKey = process.env.GEMINI_API_KEY || "AIzaSyBgWIfdAJ0ce112Ereey6-WX70WSdFbX2w";
