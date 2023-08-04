import { APIGatewayProxyEvent} from 'aws-lambda'
import { prismadbbot } from './database'

export const handler = async (
  event: APIGatewayProxyEvent
) => {
  const {hoursPast} = JSON.parse(event.body!) 
  const channels = await prismadbbot.botChannels.findMany()
  const YTapiKey = process.env.YOUTUBE_API_KEY_33WEB
  let scannedVideos = 0
  let videosSaved = 0

  for await (const channel of channels) {
    console.log("waiting...")
    await new Promise(r => setTimeout(r, 1000));

    //GET DATE 1 HOUR AGO
    const currentDate = new Date();
    const currentDateMinusHour = new Date(currentDate);
    currentDateMinusHour.setHours(currentDate.getHours() - hoursPast);
    const publishedAfter = currentDateMinusHour.toISOString();
    //

    try { //GET VIDEOS FROM CHANNEL
      const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=50&channelId=${channel.channelID}&key=${YTapiKey}&type=video&publishedAfter=${publishedAfter}&regionCode=US`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      //NO VIDEO FOR CHANNEL? SKIP
      if (+data.pageInfo.totalResults === 0) { 
        continue
    } else {
        // CHECK IF VIDEO IS BETWEEN 3 AND 11 MINUTES
        let countvideos = 0
        for await (const item of data.items) {
            await new Promise(r => setTimeout(r, 500));
            const videoID = item.id.videoId
            const videoDuration = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${item.id.videoId}&key=${YTapiKey}`;
            try {

              // GET VIDEO DURATION
              const response = await fetch(videoDuration);
              const data = await response.json();
              const duration = data.items[0].contentDetails.duration;
              const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
              const hours = parseInt(match[1]) || 0;
              const minutes = parseInt(match[2]) || 0;
              const seconds = parseInt(match[3]) || 0;
              const durationInSeconds = hours * 3600 + minutes * 60 + seconds;
              //

              // CHECK IF VIDEO IS BETWEEN 3 AND 11 MINUTES
              if (durationInSeconds > 180 && durationInSeconds < 660) {

                await prismadbbot.botVideos.create({
                  data: {
                    videoID: videoID,
                    videoName: item.snippet.title,
                    videoChannel: item.snippet.channelTitle,
                    videoLenght: durationInSeconds,
                    status: "fetched"
                  }
                })
                videosSaved++
              } 
            } catch (err) {
              console.error('error call get video duration:', err);
            }
            scannedVideos++
            continue             
          }
          console.log(`${channel.channelName}: ${videosSaved}/${scannedVideos}`, )  
          continue
    }
  } catch (err) {
      console.error('error call getVideo for channel:', err);
    }
  }

    // ********************UPDATE DASHBOARD**********************************
    const currentDate = new Date().toISOString().split('T')[0];
    await prismadbbot.botDashboard.upsert({
    update: {
        scannedVideos: {increment: scannedVideos},
        scanRuns: {increment: 1},
    },
    where: { Date: currentDate },
    create: {
        Date: currentDate, 
        scanRuns: 1,
        scannedVideos: scannedVideos,
        commentedVideos: 0,
        commentRuns: 0,
        pageViewFromYoutube: 0,
    },
    })
    // ********************UPDATE DASHBOARD**********************************

  return {
    statusCode: 200,
    body: JSON.stringify({scannedVideos, videosSaved}),
  }
}
