import { PrismaClient } from '@prisma/client'
const prismadbbot = new PrismaClient()
import * as yt from 'youtube-info-streams';
// var getSubtitles = require('youtube-captions-scraper').getSubtitles;
import { getSubtitles } from 'youtube-captions-scraper';
import { promptTokensEstimate } from "openai-chat-tokens";
import { Configuration, OpenAIApi } from "openai";
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const OPENAI_GPT35_4K_USD_PER_TOKEN = 0.0000015
// const { google } = require('googleapis');
import { google } from 'googleapis';

const client = new google.auth.OAuth2(
  process.env.YT_CLIENT_ID,
  process.env.YT_CLIENT_SECRET,
  process.env.YT_REDIRECT_URL
);

let Functions = [
  {
    "name": "video_interpreter",
    "description": `This functions takes a youtube video transcript and creates highlights containing the main points of the whole video. It also creates a one paragraph review of the video content.`,
    "parameters": {
      // SCHEMA:
      "type": "object",
      "properties": {
        "highlights": {
          "type": "array",
          "description": `An array of objects containing the highlights for the main points of the given video.`,
          "items": {
            "type": "object",
            "description": "this object contains the timestamp and the content of the highlight",
            "properties": {
              "timestamp": {
                "type": "string",
                "description": "format of minutes:seconds (mm:ss)",
              },
              "highlight": {
                "type": "string",
                "description": "A highlight description",
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

export const handler = async (
  event
) => {
  let commentedVideos = 0
  const currentDate = new Date().toISOString().split('T')[0];

  try {
    const { doComments } = JSON.parse(event.body)
    if (doComments) {
      await setYoutubeClient()
    }
    //LOG INICIAL
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
        status: {
          in: doComments ? ["fetched", "generated"] : ["fetched"]
        }
      }
    });

    console.log("videos Pulled: ", videos.length)

    for (const video of videos) {
      if (video.status === "fetched") {
        console.log("START GENERATION - videoID: ", video.videoID)
        const videoInfos = await yt.info(video.videoID);
        if ( !videoInfos.player_response.captions ||
          !videoInfos.player_response.captions.playerCaptionsTracklistRenderer) {
          // await prismadbbot.botVideos.update({
          //   where: { id: video.id },
          //   data: {
          //     status: "noSubtitles"
          //   }
          // })
          console.log("noSubtitles found for this video: ", video.videoID)
          continue
        }
        let captions = videoInfos.player_response.captions.playerCaptionsTracklistRenderer.captionTracks
        let languages = ""
        let filter = captions.map((caption) => { languages = languages + " " + caption.languageCode })
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

        let finalTimmedSubsArr = await Promise.all(subs.map(async (sub) => {
          // TESTE FUTURO
          //AQUI ROLA UMA POSSIVEL OTIMIZACAO. COMO? DIMINUINDO A FREQUENCIA DAS TIMESTAMPS (só voltar o tempo junto qdo for impar o contador por ex)

          let time = await convertSecondsToMinutesAndSeconds(sub.start.split(".")[0])
          let timedsub = time + " " + sub.text
          return timedsub
          async function convertSecondsToMinutesAndSeconds(timeInSeconds) {
            const minutes = Math.floor(+timeInSeconds / 60); // Get the number of minutes
            const seconds = +timeInSeconds % 60; // Get the number of remaining seconds
            const formattedMinutes = String(minutes) // Add leading zero if needed
            const formattedSeconds = String(seconds).padStart(2, '0'); // Add leading zero if needed
            const formattedTime = `${formattedMinutes}:${formattedSeconds}`; // Combine minutes and seconds with a colon
            return formattedTime; // Return the formatted time
          }
        }))

        const formattedSubtitles = finalTimmedSubsArr.join(" ")
        const listItemsCount = await getListCount(`${videoInfos.videoDetails.lengthSeconds}`)
        const tokensCount = await countTokens(formattedSubtitles, "input")
        const aiModel = await getAiModel(tokensCount)
        const prompt = `Analyze and interpret this video: ${formattedSubtitles},  and create a list with a maximum of ${listItemsCount} highlights for it, each highlight description must not surpass 14 words, Also create a one paragraph review of the video content`

        console.log("--Calling OpenAi")
        const dateStart = new Date()
        const OpenAiresponse = await openai.createChatCompletion({
          model: aiModel,
          temperature: 0.5,
          messages: [
            { role: "system", "content": "You are a helpful reader and interpreter" },
            { role: "user", content: prompt }],
          functions: Functions,
          function_call: { name: "video_interpreter" }
        });
        const dateEnd = new Date()
        const apiCallDuration = Math.floor((dateEnd.getTime() - dateStart.getTime()) / 1000);
        console.log("--Finish OpenAi request in:", apiCallDuration, "seconds")

        const stringfiedJSONResponse = OpenAiresponse.data.choices[0].message.function_call.arguments
        const parsedstringfiedJSONResponse = JSON.parse(stringfiedJSONResponse)

        if (OpenAiresponse.status !== 200) {
          console.log(`Erro na call da Open Ai : ${OpenAiresponse.statusText}`)
          await prismadbbot.botVideos.update({
            where: { id: video.id },
            data: {
              status: "erroApiGPT",
              apiCallDuration: apiCallDuration
            }
          })
          continue
        }
        let totalTokens = OpenAiresponse.data.usage.total_tokens

        const finalText = await formatVideoData(parsedstringfiedJSONResponse)

        await prismadbbot.botVideos.update({
          where: { id: video.id },
          data: {
            videoComment: finalText,
            status: "generated",
            totalTokens: totalTokens,
            USDCost: totalTokens * OPENAI_GPT35_4K_USD_PER_TOKEN,
            apiCallDuration: apiCallDuration
          }
        })

        // MAKE COMMENT
        doComments && await makeComment(finalText, video.videoID)

        continue
      } else if (video.status === "generated") {
        // MAKE COMENT
        doComments && await makeComment(video.videoComment, video.videoID)
      }

    }
    // ********************UPDATE DASHBOARD**********************************
    console.log("DashBoard Updated: ", currentDate, " commentedVideos:", commentedVideos)
    await prismadbbot.botDashboard.upsert({
      where: { Date: currentDate },
      update: {
        lastCommentDate:  new Date()
      },
      create: {
        Date: currentDate,
        lastCommentDate:  new Date()
      }
    });
    // ********************UPDATE DASHBOARD*********************************

  } catch (error) {
    console.log("Error: ", error)
    await prismadbbot.$disconnect()
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    }
  }

  await prismadbbot.$disconnect()

  return {
    statusCode: 200,
    body: JSON.stringify({ currentDate: new Date(), commentedVideos }),
  }


  async function getListCount(totalSeconds) {
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

  async function getAiModel(tokensCount) {
    if (tokensCount < 3500) {
      return "gpt-3.5-turbo-0613"
    } else if (tokensCount >= 3500 && tokensCount < 15000) {
      return "gpt-3.5-turbo-16k-0613"
    } else if (tokensCount >= 15000 && tokensCount < 99000) {
      throw new Error('Sorry but we cant generate chapters for this video yet, longer videos support are coming soon ;)');
      return "claudev2"
    }
  }

  async function countTokens(text, type) {
    if (type === "input") {
      text.concat()
      let context = [
        {
          "name": "video_interpreter",
          "description": "This functions takes a youtube video transcript and creates and format at least five timestamps that highlights the main points of a given video",
          "parameters": {
            // SCHEMA:
            "type": "object",
            "description": `take in to account that this will be a youtube comment and all the content must fit in it`,
            "properties": {
              "chapters": {
                "type": "array",
                "description": `An array of objects with minimum 5 and maximum ${10} timestamps that highlights the main points of a given video .`,
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
        functions: context,
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

  async function formatVideoData(data) {
    const { highlights, videoReview } = data;
    let formattedChapters = '';

    highlights.forEach((chapter, index) => {
      const { timestamp, highlight } = chapter;
      const formattedChapter = `${timestamp} ${highlight}`;

      formattedChapters += `${formattedChapter}\n`;
    });

    const reviewSection = `\n${videoReview}\n`;

    const thanksMessage = `\nChapter for your videos in seconds, AI generated ;)\n`;

    return `${formattedChapters}${reviewSection}${thanksMessage}`;
  }

  async function setYoutubeClient() {
    console.log("setting youtube client")
    // GET TOKENS
    let tokenData = await prismadbbot.youtubeOathTokens.findFirst({
    })
    let expireData = tokenData?.expireData
    let actualToken = tokenData?.actualToken
    let refreshToken = tokenData?.refreshToken

    if (+expireData < Date.now()) {
      console.log("token expired, renew process started")
      const setCredentials = await client.setCredentials({
        refresh_token: refreshToken,
      });
      const response = await client.refreshAccessToken();
      const setCredentials2 = await client.setCredentials({
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
      console.log("refresh token updated")
    } else {
      console.log("token valid, using actual token")
      await client.setCredentials({
        access_token: actualToken,
        refresh_token: refreshToken,
        expiry_date: expireData
      });
    }
  }

  async function makeComment(comment, videoID) {
    // YOUTUBE COMMENT
    const youtubeClient = google.youtube({
      version: 'v3',
      auth: client,
    });

    let responseYoutubeApiComment
    try {
      responseYoutubeApiComment = await youtubeClient.commentThreads.insert({
        part: 'snippet',
        requestBody: {
          snippet: {
            videoId: videoID,
            topLevelComment: {
              snippet: {
                textOriginal: comment,
              },
            },
          },
        },
      });
    } catch (error) {
      console.log("error on make comment video:", videoID, " error:", error)
    }

    if (responseYoutubeApiComment.status === 200) {
      await prismadbbot.botVideos.update({
        where: { videoID: videoID },
        data: {
          status: "commented",
        }
      })
      await prismadbbot.botDashboard.upsert({
        update: {
          commentedVideos: { increment: 1 },
        },
        create: {
          Date: currentDate,
          commentRuns: 1,
          scannedVideos: 0,
          commentedVideos: 1,
          pageViewFromYoutube: 0,
        },
        where: { Date: currentDate },
      })
      commentedVideos++
      console.log("--successful commented video: ", videoID)
      console.log("-------awaiting 2min after youtube comment------")
      await new Promise(r => setTimeout(r, 120000));
      return true
    } else {
      console.log("error in youtube api comment: ", responseYoutubeApiComment)
      return false
    }
  }

}


