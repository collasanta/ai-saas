// @ts-nocheck
import { APIGatewayProxyEvent } from 'aws-lambda'
import { prismadbbot } from './database'
import { Innertube } from 'youtubei.js';

export const handler = async (
  event: APIGatewayProxyEvent
) => {
  const youtube = await Innertube.create();
  const currentDate = new Date();
  const channels = await prismadbbot.botChannels.findMany()
  const videos = await prismadbbot.botVideos.findMany()
  let scannedVideos = 0
  let videosSaved = 0

  for await (const channel of channels) {
    try { //GET VIDEOS FROM CHANNEL
      await new Promise(r => setTimeout(r, 100));
      const channelx = await youtube.getChannel(channel.channelID);
      const channelvideos = await channelx.getVideos()
      const channelvideos2 = channelvideos.videos

      const recentChannelvideos = channelvideos2.filter((video) => {
        return video.published.text.includes("hours")
      })

      if (recentChannelvideos.length === 0) {
        console.log(`${channel.channelName}: ${videosSaved}/${scannedVideos}`)
        continue
      } else {
        for await (const item of recentChannelvideos) {
          await new Promise(r => setTimeout(r, 100));
          const videoID = item.id
          const videoDuration = +item.duration.seconds

          if (videoDuration > 180 && videoDuration < 660) {

            //check if video is already saved
            const checkIfNewVideoDB = videos.find((video) => {
              return video.videoID === videoID
            })
            if (checkIfNewVideoDB) {
              continue
            }

            await prismadbbot.botVideos.create({
              data: {
                videoID: videoID,
                videoName: item.title.text,
                videoChannel: channel.channelName,
                videoLenght: videoDuration,
                status: "fetched"
              }
            })
            videosSaved++
          }

          scannedVideos++
          continue
        }
        console.log(`${channel.channelName}: ${videosSaved}/${scannedVideos}`)
        continue
      }
    } catch (err) {
      console.error('error call getVideo for channel:', err);
    }
  }

  // ********************UPDATE DASHBOARD**********************************
  const currentDateFormatted = currentDate.toISOString().split('T')[0];
  await prismadbbot.botDashboard.upsert({
    update: {
      scannedVideos: { increment: scannedVideos },
      scanRuns: { increment: 1 },
      lastScanDate: currentDate,
    },
    where: { Date: currentDateFormatted },
    create: {
      Date: currentDateFormatted,
      scanRuns: 1,
      scannedVideos: scannedVideos,
      commentedVideos: 0,
      commentRuns: 0,
      pageViewFromYoutube: 0,
      lastScanDate: currentDate,
    },
  })
  // ********************UPDATE DASHBOARD**********************************
  console.log("Finish: ", "scannedVideos: ", scannedVideos, ", videosSaved", videosSaved)
  return {
    statusCode: 200,
    body: JSON.stringify({ scannedVideos, videosSaved }),
  }

}
