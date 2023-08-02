import { IChapterList } from "@/lib/archives"
import { ArrowDown, FileVideo, Key, MousePointerClick, Pointer } from "lucide-react"
import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import toast, { Toaster } from "react-hot-toast";
import Image from "next/image";

export const ChapterCard = (
    { chapter, collapsed = false }: { chapter: IChapterList, collapsed?: boolean }
) => {

    const [isOpen, setIsOpen] = useState(collapsed);

    function handleClick() {
        setIsOpen(!isOpen);
        console.log(isOpen)
    }

    function copy(item: string) {
        function copyToClipboard(text: string) {
            const tempInput = document.createElement("textarea");
            tempInput.value = text;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand("copy");
            document.body.removeChild(tempInput);
        }


        const div = document.getElementById(item);

        if (div instanceof HTMLDivElement) {
            const textToCopy = div.innerText;
            copyToClipboard(textToCopy);
            toast.success(`${item} Copied to clipboard`);
        } else {
            console.error("The element with id 'div' is not a div element.");
        }

    }

    return (
        <div className="flex flex-col border max-w-[750px] bg-secondary border-black/5 text-card-foreground shadow-sm rounded-lg text-[13px]  py-2 px-2 hover:shadow-lg transition cursor-pointer">
            <div onClick={handleClick} className="    flex items-center justify-between ">
                <div className="flex items-center gap-x-2 truncate">
                    <div className="w-fit bg-emerald-500/10 rounded-full">
                        <Image src={chapter.videoInfos.videoThumb} width={112} height={64} alt="thumbnail" className="rounded-md"/>
                    </div>
                </div>
                <p className="font-semibold text-sm pr-2 text-center whitespace-break-spaces">
                    {chapter.videoInfos.videoTitle.length > 50 ? chapter.videoInfos.videoTitle.substring(0, 50) + "..." : chapter.videoInfos.videoTitle}
                </p>
                <div>
                    {
                        isOpen ? <ArrowDown className="w-5 h-5 transform rotate-180" /> : <ArrowDown className="w-5 h-5" />
                    }
                </div>
            </div>
            {isOpen && (
                <>
                    <div className="mt-6 flex justify-center border bg-card  border-black/5 rounded-lg p-2">
                        <Tabs defaultValue="chapters" className="w-full text-center mb-4 md:px-6">
                            <TabsList className="mb-2">
                                <TabsTrigger value="chapters">Chapters</TabsTrigger>
                                <TabsTrigger value="description">Review</TabsTrigger>
                            </TabsList>
                            <TabsContent value="chapters" onClick={() => copy("Chapters")}>
                                <div className="space-x-1 align-baseline mb-3">
                                    <Pointer className="w-4 h-4 inline-block" color="#a8a3a3" />
                                    <a className="text-zinc-400 italic align-bottom">click to copy</a>
                                </div>
                                <div id="Chapters" className="flex flex-col justify-start pl-3 space-y-2">
                                    {
                                        chapter.gptResponse.chapters.map((chapter) => (
                                            <div className="text-start" key={chapter.timestamp}>
                                                <a className="text-[#065fd4] text-start">{chapter.timestamp + " "}</a>
                                                <a className="text-[#0f0f0f]">{chapter.chapter + "\n"}</a>
                                            </div>
                                        ))
                                    }
                                </div>
                            </TabsContent>
                            <TabsContent value="description" onClick={() => copy("Review")}>
                                <div className="space-x-1 align-baseline mb-3">
                                    <Pointer className="w-4 h-4 inline-block" color="#a8a3a3" />
                                    <a className="text-zinc-400 italic align-bottom">click to copy</a>
                                </div>
                                <div id="Review" className="px-1">
                                    {chapter.gptResponse.videoReview}
                                    <div className="space-x-1 mt-2 align-baseline mb-2">
                                        <br></br>
                                        <Key className="w-5 h-5 inline-block" color="#a8a3a3" />
                                        <a className="text-zinc-400 italic align-bottom">Keywords</a>
                                    </div>
                                    <div className="px-1">
                                        {chapter.gptResponse.keywords.map((keyword, index) => (index === chapter.gptResponse.keywords.length -1 ? keyword : keyword + ", "))}
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </>
            )}
        </div>
    )
}