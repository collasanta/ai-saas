import { PrismaClient } from '@prisma/client'
const prismadbbot = new PrismaClient()

export const handler = async (event) => {
  const dashboardData = await prismadbbot.botDashboard.findMany({
    select: {
      Date: true,
      cronRuns: true,
      commentedVideos: true,
      pageViewFromYoutube: true,
    },
    orderBy: {
      Date: 'desc',
    },
  })
  console.log("dashboardata: ",dashboardData)
  await prismadbbot.$disconnect()
  return {
    statusCode: 200,
    body: JSON.stringify({ dashboardData }),
  }

}
