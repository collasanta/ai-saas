const fetch = require('node-fetch');

export const cron = async () => {
  const apiKey = process.env.MY_API_KEY
  const botGetLastVideosUrl = process.env.BOT_GET_LAST_VIDEOS_URL!

  try {
    console.log("start botGetLastVideosUrlCall")
    const botGetLastVideosUrlCall = await fetch(botGetLastVideosUrl, { method: 'GET', headers: { 'x-api-key': apiKey } });
    if (!botGetLastVideosUrlCall.ok) {
      throw new Error(`Network response was not ok. Status: ${botGetLastVideosUrlCall.status}`);
    }
    const json = await botGetLastVideosUrlCall.json();
    console.log(json);
  } catch (err) {
    console.error('error:', err);
  }

}



