'use server'
import { auth } from "@clerk/nextjs"
import prismadb from "@/lib/prismadb"
import { MAX_FREE_COUNTS } from "@/constants"

export const increaseApiLimit = async (amount:number) => {
    const { userId } = auth()

    if (!userId) {
        return false
    }

    const userApiLimit = await prismadb.userApiLimit.findUnique({
        where: {
            userId
        }
    })

    if (userApiLimit) {
        await prismadb.userApiLimit.update({
            where: { userId },
            data: { count: userApiLimit.count + amount }
        })
        console.log(`apiLimit Increase: ${amount} for user: ${userId}`)
    } else {
        await prismadb.userApiLimit.create({
            data: {
                userId,
                count: amount
            }
        })
    }
}

export const checkApiLimit = async () => {
    const { userId } = auth()
    if (!userId) {
        return false
    }

    const credits = await prismadb.userCredits.aggregate({
        where: {
            userId: { equals: userId }
        },
        _sum: {
            credits: true
        }
    }).then((res) => res._sum.credits)

    const userApiLimit = await prismadb.userApiLimit.findUnique({
        where: { userId }
    })

    if (!credits) {
        if (!userApiLimit || userApiLimit.count < MAX_FREE_COUNTS) {
            return true
        }
    } else {
        const maxUsage = MAX_FREE_COUNTS + credits
        if (userApiLimit?.count! <= maxUsage) {
            return true
        } else {
            return false
        }
    }
}

export const getApiLimit = async () => {
    const { userId } = auth()

    if (!userId) {
        return 0
    }

    const credits = await prismadb.userCredits.aggregate({
        where: {
            userId: { equals: userId }
        },
        _sum: {
            credits: true
        }
    }).then((res) => res._sum.credits)


    const maxUsage = MAX_FREE_COUNTS + (credits ? credits : 0)

    return maxUsage
}


export const getApiLimitCount = async () => {
    const { userId } = auth()

    if (!userId) {
        return 0
    }

    const userApiLimit = await prismadb.userApiLimit.findUnique({
        where: { userId }
    })

    if (!userApiLimit) {
        return 0
    }

    return userApiLimit.count
}

export const getAvaliableBalance = async () => {
    const { userId } = auth()

    if (!userId) {
        return 0
    }

    const userUsage = await getApiLimitCount()
    const userCredits = await getApiLimit()

    const userBalance =  userCredits - userUsage
    
    return userBalance
}

export const checkUserBalance = async (price:number) => {
    const { userId } = auth()

    if (!userId) {
        return false
    }

    const userBalance = await getAvaliableBalance()

    if (userBalance >= price) {
        return true
    } else {
        return false
    }
}