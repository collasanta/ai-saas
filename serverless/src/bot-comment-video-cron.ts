const fetch = require('node-fetch');

export const cron = async () => {
  const apiKey = process.env.MY_API_KEY
  const botCommentVideos = process.env.BOT_COMMENT_VIDEOS_URL!

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

}



