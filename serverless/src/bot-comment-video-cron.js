const fetch = require('node-fetch');
import { PrismaClient } from '@prisma/client'
const prismadbbot = new PrismaClient()

export const cron = async () => {
  const apiKey = process.env.MY_API_KEY
  const botCommentVideos = process.env.BOT_COMMENT_VIDEOS_URL
  const botGetLastVideosUrl = process.env.BOT_GET_LAST_VIDEOS_URL

  try {
    console.log("start botGetLastVideosUrlCall")
    const botGetLastVideosUrlCall = await fetch(botGetLastVideosUrl,
      {
        method: 'POST', headers: { 'x-api-key': apiKey },
        body: JSON.stringify({ hoursPast: 3 })
      });
    if (!botGetLastVideosUrlCall.ok) {
      throw new Error(`Network response was not ok. Status: ${botGetLastVideosUrlCall.status}`);
    }
    const json = await botGetLastVideosUrlCall.json();
    console.log(json);
  } catch (err) {
    console.error('error:', err);
  }

  try {
    console.log("start botCommentVideosUrlCall")
    const botCommentVideosUrlCall = await fetch(botCommentVideos,
       { method: 'POST', headers: { 'x-api-key': apiKey },
        body: JSON.stringify({ doComments: true })
        });
    if (!botCommentVideosUrlCall.ok) {
      throw new Error(`Error. Status: ${botCommentVideosUrlCall.status}`);
    }
    const json = await botCommentVideosUrlCall.json();
    console.log(json);
  } catch (err) {
    console.error('error:', err);
  }

  console.log("updating dashboard")
  await prismadbbot.botDashboard.update({
    where: { Date: new Date().toISOString().split('T')[0] },
    data: {
      cronRuns: { increment: 1 }
    }
  })


  await prismadbbot.$disconnect()
}



