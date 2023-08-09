'use server'
const apiKey = process.env.MY_AWS_API_KEY!
const endpointURL = 'https://02hi27trbk.execute-api.us-east-1.amazonaws.com/dev/bot/dashdata'


export const getBotDashboardData = async () => {
  try {
    console.log("Cron: start botGetLastVideosUrl api call")
    const botGetLastVideosUrlCall = await fetch(endpointURL,
      {
        method: 'GET', headers: { 'x-api-key': apiKey },
      });
    const json = await botGetLastVideosUrlCall.json();
    const {dashboardData} = json
    return dashboardData
  } catch (err) {
    console.error('getBotDashboardData api call error :', err);
  }
};

