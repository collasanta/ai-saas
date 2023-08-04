const fetch = require('node-fetch');

export const cron = async () => {
  const apiKey = process.env.MY_API_KEY
  const botCommentVideos = process.env.BOT_COMMENT_VIDEOS_URL!

  try {
    console.log("start botCommentVideosUrlCall")
    const botCommentVideosUrlCall = await fetch(botCommentVideos, { method: 'GET', headers: { 'x-api-key': apiKey } });
    if (!botCommentVideosUrlCall.ok) {
      throw new Error(`Network response was not ok. Status: ${botCommentVideosUrlCall.status}`);
    }
    const json = await botCommentVideosUrlCall.json();
    console.log(json);
  } catch (err) {
    console.error('error:', err);
  }

}



