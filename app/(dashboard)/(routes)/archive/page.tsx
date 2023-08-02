"use client"

import { ChapterCard } from "@/components/chapterCard"
import { IChapterList, getUserChapters } from "@/lib/archives"
import { FileVideo } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function Home() {
  const router = useRouter()
  const [chapters, setChapters] = useState<any>([]);

  useEffect(() => {
    (async function () {
      try {
        const chaptersData:any = await getUserChapters();
        console.log("chaptersData", chaptersData);
        setChapters(chaptersData);
      } catch (error) {
        console.error('Error fetching chapters data:', error);
      }
    })();
  }, []);
  return (
      <div>
        <div className="mb-8 space-y-4">
          <h2 className="text-2xl md:text-4xl font-bold text-center">
            Archives
          </h2>
          <p className="text-muted-foreground font-light text-small md:text-lg text-center">
            All your generations are saved here
          </p>
        </div>
        <div className="px-4 md:px-20 lg:px-32 space-y-4">
          {/* <ChapterCard genId="asdasds" /> */}
          {chapters.map((chapter:IChapterList) => (
            <ChapterCard 
            key={chapter.videoInfos.generationId}
            chapter={chapter}
            />
          ))}
        </div>
      </div>
  )
}
