import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda'
import { prismadbbot } from './database'
import * as yt from 'youtube-info-streams';
var getSubtitles = require('youtube-captions-scraper').getSubtitles;
import { promptTokensEstimate } from "openai-chat-tokens";
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const OPENAI_GPT35_4K_USD_PER_TOKEN = 0.0000015
const { google } = require('googleapis');


export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  try {
    let commentedVideos = 0
    //LOG INICIAL
    const currentDate = new Date().toISOString().split('T')[0];
    await prismadbbot.botDashboard.upsert({
      update: {
        commentRuns: { increment: 1 },
      },
      create: {
        Date: currentDate,
        commentRuns: 1,
        scannedVideos: 0,
        commentedVideos: 0,
        pageViewFromYoutube: 0,
      },
      where: { Date: currentDate },
    })

    const videos = await prismadbbot.botVideos.findMany({
      where: {
        videoID: "zhHch_Qu2sk",

      }
    })

    for (const video of videos) {
      console.log("await 10sec... between calls")
      await new Promise(r => setTimeout(r, 10000));
      if (video.videoComment === "") {
        console.log("COMMENT START - videoID: ", video.videoID)
        const videoInfos = await yt.info(video.videoID);
        if (videoInfos.player_response.captions.playerCaptionsTracklistRenderer === undefined) {
          await prismadbbot.botVideos.update({
            where: { id: video.id },
            data: {
              status: "noSubtitles"
            }
          })
          console.log("noSubtitles found for this video")
          continue
        }
        let captions = videoInfos.player_response.captions.playerCaptionsTracklistRenderer.captionTracks
        let languages = ""
        let filter = captions.map((caption: any) => { languages = languages + " " + caption.languageCode })
        let languagesArr = languages.split(" ")
        const languagesArrFiltered = languagesArr.filter((str) => str !== '');
        let selectedSub = languagesArr.find(a => a.includes("en"));
        if (!selectedSub) {
          selectedSub = languagesArr[0]
        }
        let subs = await getSubtitles({
          videoID: video.videoID, // youtube video id
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
        const formattedSubtitles = finalTimmedSubsArr.join(" ")
        const listItemsCount: any = await getListCount(`${videoInfos.videoDetails.lengthSeconds}`)
        console.log("listItemsCount: ", listItemsCount)
        const tokensCount = await countTokens(formattedSubtitles, "input")
        const aiModel = await getAiModel(tokensCount!)

        const prompt = `Analyze and interpret this video: ${formattedSubtitles}`
        let Functions = [
          {
            "name": "video_interpreter",
            "description": "This functions takes a video and creates a list of chapters, a video review",
            "parameters": {
              // SCHEMA:
              "type": "object",
              "properties": {
                "chapters": {
                  "type": "array",
                  "description": `An array of maximum ${listItemsCount} objects decribing the most relevant parts of the video as chapters. (The maximum number of items is ${listItemsCount} please respect it)`,
                  "items": {
                    "type": "object",
                    "description": "the chapter with his beggining time and description",
                    "properties": {
                      "timestamp": {
                        "type": "string",
                        "description": "time of the begginning of the chapter in the format of minutes:seconds (mm:ss)",
                      },
                      "chapter": {
                        "type": "string",
                        "description": "A description of the chapter",
                      }
                    }
                  },
                },
                "videoReview": {
                  "type": "string",
                  "description": "A one paragraph review of the content of the video"
                },
              },
              "required": ["chapters", "videoReview"]
            }
          }
        ]

        console.log("calling OpenAi")
        const OpenAiresponse = await openai.createChatCompletion({
          model: aiModel!,
          temperature: 0,
          messages: [
            { role: "system", "content": "You are a helpful reader and interpreter" },
            { role: "user", content: prompt }],
          functions: Functions,
          function_call: { name: "video_interpreter" }
        });
        console.log("finish OpenAi request")


        if (OpenAiresponse.status !== 200) {
          console.log(`Erro na call da Open Ai : ${OpenAiresponse.statusText}`)
          await prismadbbot.botVideos.update({
            where: { id: video.id },
            data: {
              status: "erroApiGPT",
            }
          })
          continue
        }
        let totalTokens = OpenAiresponse.data.usage.total_tokens

        const treatedResponse = OpenAiresponse.data.choices[0].message
        const stringfiedJSONResponse = OpenAiresponse.data.choices[0].message.function_call.arguments
        const parsedstringfiedJSONResponse = JSON.parse(stringfiedJSONResponse)

        const finalText = await formatVideoData(parsedstringfiedJSONResponse)

        await prismadbbot.botVideos.update({
          where: { id: video.id },
          data: {
            videoComment: finalText,
            status: "generated",
            totalTokens: totalTokens,
            USDCost: totalTokens * OPENAI_GPT35_4K_USD_PER_TOKEN
          }
        })

        console.log("finalText", finalText)

        // YOUTUBE COMMENT
        const client = new google.auth.OAuth2(
          process.env.YT_CLIENT_ID,
          process.env.YT_CLIENT_SECRET,
          process.env.YT_REDIRECT_URL
        );

        // GET TOKENS
        let tokenData = await prismadbbot.youtubeOathTokens.findFirst({
        })
        let expireData = tokenData?.expireData
        let actualToken = tokenData?.actualToken
        let refreshToken = tokenData?.refreshToken

        if (+expireData! < Date.now()) {
          console.log("token expired, renew process started")
          await client.setCredentials({
            refresh_token: process.env.YT_REFRESH_TOKEN,
          });
          console.log("before refreshAccessToken")

          const response = await client.refreshAccessToken();
          console.log("response refreshAccessToken", response)
          await client.setCredentials({
            access_token: response.credentials.access_token,
            refresh_token: refreshToken,
            expiry_date: response.credentials.expiry_date
          });
          await prismadbbot.youtubeOathTokens.update({
            where: {
              id: 1
            },
            data: {
              actualToken: response.credentials.access_token,
              expireData: `${response.credentials.expiry_date}`
            }
          })
        } else {
          await client.setCredentials({
            access_token: actualToken,
            refresh_token: process.env.YT_REFRESH_TOKEN,
            expiry_date: expireData
          });
        }

        const youtube = google.youtube({
          version: 'v3',
          auth: client,
        });

        const responseYoutubeApiComment = await youtube.commentThreads.insert({
          part: 'snippet',
          requestBody: {
            snippet: {
              videoId: video.id,
              topLevelComment: {
                snippet: {
                  textOriginal: finalText,
                },
              },
            },
          },
        });

        console.log("youtube response comment api", responseYoutubeApiComment)
        if (responseYoutubeApiComment.status === 200) {
          console.log("commentado com sucesso, video: ", video.id)
          await prismadbbot.botVideos.update({
            where: { id: video.id },
            data: {
              status: "commented",
            }
          })
          commentedVideos++
          continue
        }
      }
      
    }

    // ********************UPDATE DASHBOARD**********************************

    await prismadbbot.botDashboard.update({
      where: { Date: currentDate },
      data: {
        commentedVideos: commentedVideos,
      }
    })
    // ********************UPDATE DASHBOARD*********************************

  } catch (error: any) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    }
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

  async function formatVideoData(data: any): Promise<string> {
    const { chapters, videoReview } = data;
    let formattedChapters = '';

    chapters.forEach((chapter: any, index: any) => {
      const { timestamp, chapter: chapterTitle } = chapter;
      const formattedChapter = `${timestamp} ${chapterTitle}`;

      formattedChapters += `${formattedChapter}\n`;
    });

    const reviewSection = `Review:\n${videoReview}`;

    return `Yess, AI Chad watched the video and here is the review:\n${formattedChapters}\n${reviewSection}\nThanks Chad ;)`;
  }

  return {
    statusCode: 200,
    body: JSON.stringify( true ),
  }
}


