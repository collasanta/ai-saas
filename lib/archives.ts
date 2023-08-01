'use server'

import { auth } from "@clerk/nextjs"
import prismadb from "./prismadb"

export interface IChapterList {
    videoInfos: {
        languages: string;
        videoLenghtSeconds: string;
        videoLengthMinutes: number;
        videoLenghtFormatted: string;
        videoTitle: string;
        videoChannelName: string;
        videoThumb: string;
        videoId: string;
        generationId: string;
    };
    gptResponse: {
        chapters: {
            timestamp: string;
            chapter: string;
        }[];
        videoReview: string;
        keywords: string[];
    };
}

export const getUserChapters = async () => {
    console.time("getUserChapters")
    const { userId } = auth()
    if (!userId) {
        throw new Error('User not logged in');
    }

    const chapters = await prismadb.archives.findMany({
        where: {
            userId: userId,
            gptResponse: {
                not: {
                    equals: null,
                },
            },
        },
        select: {
            videoInfos: true,
            gptResponse: true,
        },
    });

    if (!chapters) {
        return null
    }

    chapters.map((chapter) => {
        chapter.gptResponse = JSON.parse(chapter.gptResponse as string);
        chapter.videoInfos = JSON.parse(chapter.videoInfos as string);
    })


    return chapters
}