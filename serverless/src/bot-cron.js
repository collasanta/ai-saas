import { PrismaClient } from '@prisma/client'
import fetch from 'node-fetch'

const prismadbbot = new PrismaClient()

export const cron = async () => {
  const apiKey = process.env.MY_API_KEY
  const botCommentVideosUrl = process.env.BOT_COMMENT_VIDEOS_URL
  const botGetLastVideosUrl = process.env.BOT_GET_LAST_VIDEOS_URL
  console.log({apiKey, botCommentVideosUrl, botGetLastVideosUrl})
  console.log("updating dashboard")
  await prismadbbot.botDashboard.update({
    where: { Date: new Date().toISOString().split('T')[0] },
    data: {
      cronRuns: { increment: 1 }
    }
  })

  try {
    console.log("Cron: start botGetLastVideosUrl api call")
    const botGetLastVideosUrlCall = await fetch(botGetLastVideosUrl,
      {
        method: 'POST', headers: { 'x-api-key': apiKey },
        body: JSON.stringify()
      });
    const json = await botGetLastVideosUrlCall.json();
    console.log(json);
  } catch (err) {
    console.error('botGetLastVideosUrl api call error :', err);
  }

  const videosToComment = await prismadbbot.botVideos.findMany({
    where: {
      status: {
        in: ["fetched", "generated"]
      }
    }
  });

  console.log("videos to comment: ", videosToComment.length)

  if (videosToComment.length > 0) {
    try {
      console.log("Cron: start botCommentVideos api call")
      const botCommentVideosUrlCall = await fetch(botCommentVideosUrl,
         { method: 'POST', headers: { 'x-api-key': apiKey },
          body: JSON.stringify({ doComments: true })
          });
      const json = await botCommentVideosUrlCall.json();
      console.log(json);
    } catch (err) {
      console.error('botCommentVideos api call error:', err.message);
    }
  }




  await prismadbbot.$disconnect()
}



