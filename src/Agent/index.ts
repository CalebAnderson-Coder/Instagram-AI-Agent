import { GoogleGenerativeAI } from "@google/generative-ai";
import { IgApiClient } from 'instagram-private-api';
import logger from "../config/logger";
import { geminiApiKey, IGusername, IGpassword } from "../secret";
import { handleError } from "../utils";
import { InstagramCommentSchema } from "./schema";
import fs from "fs";
import path from "path";
import * as readlineSync from "readline-sync";
import usersToFollow from "./users_to_follow.json";

// Configurar cliente de Instagram
const igClient = new IgApiClient();
igClient.state.generateDevice(IGusername);
let isLoggedIn = false;

async function loginToInstagram() {
    if (!isLoggedIn) {
        await igClient.account.login(IGusername, IGpassword);
        isLoggedIn = true;
    }
}

export async function runAgent(schema: InstagramCommentSchema, prompt: string): Promise<any> {
    if (!geminiApiKey) {
        logger.error("No Gemini API key available.");
        return "No API key available.";
    }
    const generationConfig = {
        responseMimeType: "application/json",
        responseSchema: schema,
    };

    const googleAI = new GoogleGenerativeAI(geminiApiKey);
    const model = googleAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig,
        systemInstruction: {
            parts: [{text: "Responde siempre en español, usando un tono natural y coloquial adecuado para redes sociales."}],
            role: "model"
        }
    });

    try {
        const result = await model.generateContent(prompt);

        if (!result || !result.response) {
            logger.info("No response received from the AI model. || Service Unavailable");
            return "Service unavailable!";
        }

        const responseText = result.response.text();
        const data = JSON.parse(responseText);

        return data;
    } catch (error) {
        await handleError(error, 0, schema, prompt, runAgent);
    }
}

export function chooseCharacter(): any {
    const charactersDir = (() => {
        const buildPath = path.join(__dirname, "characters");
        if (fs.existsSync(buildPath)) {
            return buildPath;
        } else {
            // Fallback to source directory
            return path.join(process.cwd(), "src", "Agent", "characters");
        }
    })();
    const files = fs.readdirSync(charactersDir);
    const jsonFiles = files.filter(file => file.endsWith(".json"));
    if (jsonFiles.length === 0) {
        throw new Error("No character JSON files found");
    }
    console.log("Select a character:");
    jsonFiles.forEach((file, index) => {
        console.log(`${index + 1}: ${file}`);
    });
    const answer = readlineSync.question("Enter the number of your choice: ");
    const selection = parseInt(answer);
    if (isNaN(selection) || selection < 1 || selection > jsonFiles.length) {
        throw new Error("Invalid selection");
    }
    const chosenFile = path.join(charactersDir, jsonFiles[selection - 1]);
    const data = fs.readFileSync(chosenFile, "utf8");
    const characterConfig = JSON.parse(data);
    return characterConfig;
}

export function initAgent(): any {
    try {
        const character = chooseCharacter();
        console.log("Character selected:", character);
        
        console.log("\nSelect mode:");
        console.log("1: Feed interaction");
        console.log("2: Specific users interaction");
        const mode = readlineSync.question("Enter mode number: ");
        
        return {
            character,
            mode: parseInt(mode)
        };
    } catch (error) {
        console.error("Error initializing agent:", error);
        process.exit(1);
    }
}

async function interactWithUserPosts(username: string, character: any) {
    console.log(`Iniciando búsqueda específica de posts de @${username}...`);
    
    try {
        await loginToInstagram();
        
        // Obtener ID de usuario y verificar
        console.log(`Buscando ID de usuario para @${username}...`);
        const userId = await igClient.user.getIdByUsername(username);
        console.log(`ID encontrado: ${userId} para @${username}`);
        
        // Crear feed específico para el usuario
        const userFeed = igClient.feed.user(userId);
        console.log(`Obteniendo posts específicos de @${username}...`);
        const posts = await userFeed.items();
        
        if (posts.length === 0) {
            console.log(`No se encontraron posts para @${username}`);
            return;
        }
        
        // Validar que los posts son del usuario correcto
        const validPosts = posts.filter(post => 
            post.user.username.toLowerCase() === username.toLowerCase()
        );
        
        if (validPosts.length === 0) {
            console.log(`Advertencia: Los posts obtenidos no pertenecen a @${username}`);
            return;
        }
        
        // Interactuar solo con los posts más recientes (según configuración)
        const postsToInteract = validPosts.slice(0, usersToFollow.settings.max_posts_per_user);
        console.log(`Listos para interactuar con ${postsToInteract.length} posts de @${username}`);
        
        for (const post of postsToInteract) {
            const caption = post.caption?.text || '';
            console.log(`Interactuando con post de @${post.user.username}: ${caption.substring(0, 30)}...`);
            await igClient.media.like({
                mediaId: post.id,
                d: 1, // 1 for like, 0 for unlike
                moduleInfo: {
                    module_name: 'profile',
                    user_id: userId.toString(),
                    username: username
                }
            });
            
            const comment = await generateComment(character, caption);
            console.log(`Commenting: ${comment.substring(0, 30)}...`);
            await igClient.media.comment({
                mediaId: post.id,
                text: comment
            });
            
            // Esperar intervalo aleatorio
            const delay = getRandomDelay();
            await new Promise(resolve => setTimeout(resolve, delay * 1000));
        }
    } catch (error) {
        console.error(`Error interacting with ${username}'s posts:`, error);
    }
}

function getRandomDelay(): number {
    const { min, max } = usersToFollow.settings.interaction_delay_seconds;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function generateComment(character: any, context: string): Promise<string> {
    // Implementación básica - en producción usaría la API de Gemini
    return `${character.adjectives[0]} ${context}!`;
}

async function interactWithSpecificUsers(character: any) {
    for (const username of usersToFollow.users) {
        await interactWithUserPosts(username, character);
        const delay = Math.random() * 
            (usersToFollow.settings.interaction_delay_seconds.max - 
             usersToFollow.settings.interaction_delay_seconds.min) + 
            usersToFollow.settings.interaction_delay_seconds.min;
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
    }
}

if (require.main === module) {
    (async () => {
        const { character, mode } = initAgent();
        
        if (mode === 2) {
            await interactWithSpecificUsers(character);
        } else {
            // Lógica existente para interacción con feed
        }
    })();
}
