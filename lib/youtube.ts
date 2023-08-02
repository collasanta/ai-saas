'use server'
import * as yt from 'youtube-info-streams';
import getVideoId from 'get-video-id';
import { uid } from 'uid';
var getSubtitles = require('youtube-captions-scraper').getSubtitles;
import prismadb from './prismadb';
import { auth } from "@clerk/nextjs"
import { promptTokensEstimate } from "openai-chat-tokens";
import { OPENAI_GPT35_16K_USD_PER_TOKEN, OPENAI_GPT35_4K_USD_PER_TOKEN } from '@/constants';

//INTERFACES  ///////////////////////////////////////////////////////////////////////////////////////////////////
export interface IYoutubeVideoInfo {
    languages: string | null;
    videoLenghtSeconds: number;
    videoLengthMinutes: number;
    videoLenghtFormatted: string;
    videoTitle: string;
    videoChannelName: string;
    videoThumb: string;
    videoId: string;
    generationId: string;
}

export interface IPromptInfos {
    tokensCount: number;
    credits: number;
    listItemsCount: number;
    aiModel: string;
    formattedSubtitles: string
}

export interface GPTResponse {
    chapters: {
        timestamp: string;
        chapter: string;
    }[];
    videoReview: string;
    keywords: string[];
}

// SERVER ACTIONS ///////////////////////////////////////////////////////////////////////////////////////////////////
export const getYoutubeVideoInfos = async (url: string): Promise<IYoutubeVideoInfo> => {
    console.log("getYoutubeVideoInfos")
    console.time("getYoutubeVideoInfos")
    const { userId } = auth()
    if (!userId) {
        throw new Error('Please login to use the app');
    }
    const { id } = getVideoId(url);
    if (id === null) {
        throw new Error('Invalid Youtube URL');
    }
    const videoInfos = await yt.info(id);
    const videoThumbs = videoInfos.videoDetails.thumbnail.thumbnails
    const videoThumb = videoThumbs[videoThumbs.length - 1].url
    const videoLenghtSeconds = videoInfos.videoDetails.lengthSeconds
    const videoLenghtFormatted = `${String(Math.floor(videoLenghtSeconds / 60)).padStart(2)}min ${String(videoLenghtSeconds % 60).padStart(2, '0')}sec`;
    const videoLengthMinutes = Math.round(videoLenghtSeconds / 60)
    const videoTitle = videoInfos.videoDetails.title
    const videoChannelName = videoInfos.videoDetails.ownerChannelName
    if (videoInfos.player_response.captions.playerCaptionsTracklistRenderer === undefined) {
        throw new Error('Sorry but we cant generate chapters for this video, try another one ;)');
    }
    let captions = videoInfos.player_response.captions.playerCaptionsTracklistRenderer.captionTracks
    let languages = ""
    let filter = captions.map((caption: any) => { languages = languages + caption.languageCode + " " })


    const archiveID = uid()
    const VideoInfos = { languages, videoLenghtSeconds, videoLengthMinutes, videoLenghtFormatted, videoTitle, videoChannelName, videoThumb, videoId: id, generationId: archiveID }

    await prismadb.archives.create({
        data: {
            generationId: archiveID,
            userId: userId,
            videoInfos: JSON.stringify(VideoInfos),
        }
    })

    console.timeEnd("getYoutubeVideoInfos")
    return VideoInfos
}

export const getPrompt = async (videoInfos: IYoutubeVideoInfo): Promise<IPromptInfos> => {
    console.log("getPrompt")
    console.time("getPrompt")
    const formattedSubtitles = await getFormattedSubtitles(videoInfos.videoId, videoInfos.languages!)


    const tokensCount = await countTokens(formattedSubtitles, "input")

    const listItemsCount: any = await getListCount(`${videoInfos.videoLenghtSeconds}`)
    const aiModel = await getAiModel(tokensCount!)

    const { userId } = auth()

    if (!userId) {
        throw new Error('Please login to generate chapters');
    }

    await prismadb.archives.update({
        where: {
            generationId: videoInfos.generationId
        },
        data: {
            subtitles: formattedSubtitles,
            credits: videoInfos.videoLengthMinutes,
            model: aiModel,
            promptTokens: tokensCount,
        }
    })

    const promptInfos = {
        tokensCount: tokensCount!,
        listItemsCount: listItemsCount!,
        aiModel: aiModel!,
        formattedSubtitles: formattedSubtitles!,
        credits: videoInfos.videoLengthMinutes!
    }
    console.timeEnd("getPrompt")
    return promptInfos
}

export const saveResponseDB = async (tokensCount: number, aiModel: string, generationId: string, stringfiedJsonResponse: any) => {
    console.time("saveResponseDB")
    console.log("saveResponseDB")
    const { userId } = auth()
    if (!userId) {
        throw new Error('Please login to generate chapters');
    }

    const selectedLine = await prismadb.archives.findUnique({
        where: {
            generationId: generationId,
            userId: userId
        }
    });

    console.log("typeof JSONRESPONSE", typeof stringfiedJsonResponse)
    // const textJsonResponse = JSON.stringify(stringfiedJsonResponse)
    // console.log("typeof textJsonResponse", typeof textJsonResponse)

    const completionTokens = await countTokens(stringfiedJsonResponse, "output")
    const totalTokens = selectedLine?.promptTokens! + completionTokens!;
    const USDCost = await calculateCost(totalTokens, aiModel)

    await prismadb.archives.update({
        where: {
            generationId: generationId,
            userId: userId
        },
        data: {
            completionTokens: completionTokens,
            totalTokens: totalTokens,
            USDCost,
            gptResponse: stringfiedJsonResponse
        }
    });
    console.timeEnd("saveResponseDB")
}

// AUXILIAR FUNCTIONS  ///////////////////////////////////////////////////////////////////////////////////////////////////
async function getFormattedSubtitles(videoId: string, videoLanguages: string) {
    let languagesArr = videoLanguages.split(" ")
    const languagesArrFiltered = languagesArr.filter((str) => str !== '');
    let selectedSub = languagesArr.find(a => a.includes("en"));
    if (!selectedSub) {
        selectedSub = languagesArr[0]
    }

    let subs = await getSubtitles({
        videoID: videoId, // youtube video id
        lang: selectedSub // default: `en`
    })

    let finalTimmedSubsArr = await Promise.all(subs.map(async (sub: any) => {
        // TESTE FUTURO
        //AQUI ROLA UMA POSSIVEL OTIMIZACAO. COMO? DIMINUINDO A FREQUENCIA DAS TIMESTAMPS (só voltar o tempo junto qdo for impar o contador por ex)

        let time = await convertSecondsToMinutesAndSeconds(sub.start.split(".")[0])
        let timedsub = time + " " + sub.text
        return timedsub
        async function convertSecondsToMinutesAndSeconds(timeInSeconds: string) {
            const minutes = Math.floor(+timeInSeconds / 60); // Get the number of minutes
            const seconds = +timeInSeconds % 60; // Get the number of remaining seconds
            const formattedMinutes = String(minutes) // Add leading zero if needed
            const formattedSeconds = String(seconds).padStart(2, '0'); // Add leading zero if needed
            const formattedTime = `${formattedMinutes}:${formattedSeconds}`; // Combine minutes and seconds with a colon
            return formattedTime; // Return the formatted time
        }
    }))

    const finalTimmedSubs = finalTimmedSubsArr.join(" ")
    return finalTimmedSubs
}

async function getListCount(totalSeconds: string) {
    if (+totalSeconds < 180) { //menor que 3 minutos
        return 3
    } else if (+totalSeconds >= 180 && +totalSeconds < 300) { //entre 3minutos e 5 minutos
        return 4
    } else if (+totalSeconds >= 300 && +totalSeconds < 360) { //entre 5minutos e 6 minutos
        return 5
    } else if (+totalSeconds >= 360 && +totalSeconds < 420) { //entre 6 minutos e 7 minutos
        return 6
    } else if (+totalSeconds >= 420 && +totalSeconds < 480) { //entre 7 minutos e 8 minutos
        return 7
    } else if (+totalSeconds >= 480 && +totalSeconds < 540) { //entre 8 minutos e 9 minutos
        return 8
    } else if (+totalSeconds >= 540 && +totalSeconds < 600) { //entre 8 minutos e 9 minutos
        return 9
    } else if (+totalSeconds >= 600) { //entre 9 minutos e 11 minutos
        return 10
    }
}

async function countTokens(text: string, type: "input" | "output") {
    if (type === "input") {
        text.concat()
        let Functions = [
            {
                "name": "video_interpreter",
                "description": "This functions takes a video transcript and creates a list of chapters, a video review, and a list of keywords based on the transcript.",
                "parameters": {
                    // SCHEMA:
                    "type": "object",
                    "properties": {
                        "chapters": {
                            "type": "array",
                            "description": `An array of objects decribing the most relevant parts of the video, the array max lenght must be ${10}.`,
                            "items": {
                                "type": "object",
                                "description": "object with timestamp and a descriptive chapter",
                                "properties": {
                                    "timestamp": {
                                        "type": "string",
                                        "description": "timestamp in the format of minutes:seconds",
                                    },
                                    "chapter": {
                                        "type": "string",
                                        "description": "A descriptive chapter name",
                                    }
                                }
                            },
                        },
                        "videoReview": {
                            "type": "string",
                            "description": "A review of the content of the video (do not cite the word 'transcript')"
                        },
                        "keywords": {
                            "type": "array",
                            "description": "A list of SEO keywords that describe the content of the video to better rank at Youtube",
                            "items": { "type": "string" }
                        }
                    },
                    "required": ["chapters", "videoReview", "keywords"]
                }
            }
        ]
        const prompt = `Analyze and interpret this video transcript: ${text}`
        const InputTokenCount = promptTokensEstimate({
            messages: [
                { role: "system", "content": "You are a helpful reader and interpreter" },
                { role: "user", content: prompt }],
            functions: Functions,
        })
        return InputTokenCount
    }

    if (type === "output") {
        const outputTokenCount = promptTokensEstimate({
            messages: [
                { role: "system", "content": text },
            ],
        })
        return outputTokenCount
    }
}

async function getAiModel(tokensCount: number) {
    if (tokensCount < 3500) {
        return "gpt-3.5-turbo-0613"
    } else if (tokensCount >= 3500 && tokensCount < 15000) {
        return "gpt-3.5-turbo-16k-0613"
    } else if (tokensCount >= 15000 && tokensCount < 99000) {
        throw new Error('Sorry but we cant generate chapters for this video yet, longer videos support are coming soon ;)');
        return "claudev2"
    }
}

async function calculateCost(tokensCount: number, aiModel: string) {
    if (aiModel === "gpt-3.5-turbo-0613") {
        return OPENAI_GPT35_4K_USD_PER_TOKEN * tokensCount
    } else if (aiModel === "gpt-3.5-turbo-16k-0613") {
        return OPENAI_GPT35_16K_USD_PER_TOKEN * tokensCount
    } else {
        throw new Error('calculateCostmodelNotFound: 16k tokens + not supported yet');
    }
}
