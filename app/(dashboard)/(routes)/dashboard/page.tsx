/* eslint-disable @next/next/no-img-element */
"use client"
import Heading from "@/components/heading";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Youtube } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod";
import { formSchema } from "../archive/constants"
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ChatCompletionRequestMessage } from "openai";
import { useEffect, useState } from "react";
import { Empty } from "@/components/empty";
import { Loader } from "@/components/loader";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { BotAvatar } from "@/components/bot-avatar";
import { useProModal } from "@/hooks/use-pro-modal";
import toast from "react-hot-toast";
import FreeCounter from "@/components/free-counter";
import { checkUserBalance, getApiLimit, getApiLimitCount, getAvaliableBalance, increaseApiLimit } from "@/lib/api-limit";
import { IYoutubeVideoInfo, getPrompt, getYoutubeVideoInfos, saveResponseDB } from "@/lib/youtube";
import { MAX_FREE_COUNTS } from "@/constants";
import { JSONResponse } from "@/app/api/chapters/generate/openai/interfaces";
import axios from "axios";
import { ChapterCard } from "@/components/chapterCard";
import { IChapterList } from "@/lib/archives";
import Image from "next/image";

const DashboardPage = () => {
    const router = useRouter()
    const proModal = useProModal()
    const [messages, setMessages] = useState<ChatCompletionRequestMessage[]>([])
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            ytlink: ""
        }
    })

    const [apiLimitCount, setApiLimitCount] = useState(0)
    const [apiLimit, setApiLimit] = useState(MAX_FREE_COUNTS)
    const [videoInfos, setVideoInfos] = useState<IYoutubeVideoInfo>()
    const [chapter, setChapters] = useState<IChapterList>()
    const [isLoading, setLoading] = useState(false)

    useEffect(() => {
        (async () => {
            const apiLimitCount = await getApiLimitCount()
            console.log(apiLimitCount)
            setApiLimitCount(apiLimitCount)
            const apiLimit = await getApiLimit()
            console.log(apiLimit)
            setApiLimit(apiLimit)
        })()
    }, [])

    const loadVideoInfos = async (values: z.infer<typeof formSchema>) => {
        setLoading(true)
        try {
            const infos = await getYoutubeVideoInfos(values.ytlink)
            setVideoInfos(infos)
            console.log("VideoInfos", infos)
        } catch (error: any) {
            console.log("error: ", error.message)
            toast.error(`Something went wrong: ${error.message}`)
        } finally {
            router.refresh()
        }
        setLoading(false)
    }

    const generateChapters = async () => {

        try {
            const userBalance = await checkUserBalance(videoInfos?.videoLengthMinutes!)
            if (!userBalance) {
                proModal.onOpen()
                return
            }
            setLoading(true)
            const promptInfos = await getPrompt(videoInfos!)
            console.log("promptInfos", promptInfos)
            const timeInit = new Date().getTime()
            const chaptersResponse = await axios.post("/api/chapters/generate/openai", promptInfos)
            const timeEnd = new Date().getTime()
            const apiCallSeconds = Math.floor((timeEnd - timeInit) / 1000);
            if (chaptersResponse.status === 200) {
                await increaseApiLimit(videoInfos?.videoLengthMinutes!)
                setApiLimitCount(await getApiLimitCount())
            }
            const stringfiedJSONResponse = chaptersResponse.data.function_call.arguments
            await saveResponseDB(promptInfos.tokensCount, promptInfos.aiModel, videoInfos?.generationId!, stringfiedJSONResponse, apiCallSeconds)

            const jsonResponse = JSON.parse(stringfiedJSONResponse)

            const chapter: IChapterList = {
                videoInfos: videoInfos!,
                gptResponse: jsonResponse!
            }
            setChapters(chapter)
            toast.success("Generation saved to Archives section")
        } catch (error: any) {
            if (error?.response?.status === 403) {
                proModal.onOpen()
            } else {
                console.log("error: ", error.message)
                toast.error("something went wrong")
            }
        } finally {
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <div className="max-w-[1000px] mx-auto px-3">
            <Heading
                title="Chapters Generator"
                description="Fast chapters for your YouTube videos "
                icon={Youtube}
                iconColor="text-red-500"
                bgColor="bg-red-500/10"
            />
            <div>
                <FreeCounter dark={true} hideButton={true} tight={true} apiLimit={apiLimit} apiLimitCount={apiLimitCount} />
            </div>

            {isLoading ?
                <div className="p-8 rounded-lg w-full flex items-center justify-center ">
                    <Loader gen={!!videoInfos} />
                </div>
                :
                <>
                    {!videoInfos ?
                        <>
                            <div className="">
                                <Form {...form}>
                                    <form
                                        onSubmit={form.handleSubmit(loadVideoInfos)}
                                        className="rounded-lg border w-full p-4 px-3 md:px-6 focus-within:shadow-sm grid grid-cols-10 gap-2"
                                    >
                                        <FormField
                                            name="ytlink"
                                            render={({ field }) => (
                                                <FormItem className="col-span-10 lg:col-span-7">
                                                    <FormControl className="m-0 p-0">
                                                        <Input
                                                            className="pl-2 border-0 bg-secondary outline-none focus-visible:ring-0 focus-visible:ring-transparent"
                                                            disabled={isLoading}
                                                            placeholder="Paste Video Link Here https://www.youtube.com/watch?v=ffJ3x2dBzrlY"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <Button
                                            className="col-span-10 lg:col-span-3 w-full"
                                            disabled={isLoading}
                                        >
                                            Generate
                                        </Button>
                                    </form>
                                </Form>
                            </div>
                        </>
                        :
                        !chapter ?
                            <div className="rounded-lg border w-full p-4 px-3 md:px-6 focus-within:shadow-sm grid grid-cols-10 gap-2">
                                <div className="col-span-10 lg:col-span-7">
                                    <div className="m-0 p-0">
                                        <div
                                            className="mx-auto border-0 flex flex-col md:flex-row bg-muted rounded-lg "
                                        >
                                            <div className="w-[280px] min-w-[230px] my-auto mx-auto px-3 py-4">
                                                <Image src={videoInfos.videoThumb} width={280} height={160} alt="thumbnail" className="rounded-lg mx-auto" />
                                            </div>
                                            <div className="flex flex-col justify-center md:justify-start text-center pb-4 md:pr-6 md:py-4 rounded-lg">
                                                <p className="text-black/80 font-semibold">{videoInfos.videoTitle}</p>
                                                <p className="pb-2 text-zinc-400 secondary text-sm">{videoInfos.videoChannelName}</p>
                                                <div className="mx-auto py-1 rounded-lg min-w-[200px]">
                                                    <div className="flex flex-row mb-2 bg-white rounded-lg">
                                                        <div className="w-[45%] text-end px-2"><a className="text-black/60 text-sm text-start">Lenght:</a></div>
                                                        <div className="w-[55%] text-start"><a className="text-sm text-gray-600 "> {videoInfos.videoLenghtFormatted}</a></div>
                                                    </div>
                                                    <div className="flex flex-row bg-white rounded-lg">
                                                        <div className="w-[45%] text-end px-2"><a className="text-black/60 text-sm text-start">Cost:</a></div>
                                                        <div className="w-[55%] text-start animate-pulse"><a className="text-md font-semibold text-primary "> {videoInfos.videoLengthMinutes} <a className="text-sm font-semibold">Credits</a></a></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-10 text-center lg:col-span-3 w-full">
                                    <Button
                                        className="w-full"
                                        disabled={isLoading}
                                        onClick={generateChapters}
                                    >
                                        Generate
                                    </Button>
                                </div>
                            </div>
                            :
                            <div className="rounded-lg border w-full  grid-col-start md:grid-col p-4 px-3 md:px-6 focus-within:shadow-sm grid grid-cols-10 gap-2">
                                <div className="col-span-10 lg:col-span-7">
                                    <ChapterCard chapter={chapter} collapsed={true} />
                                </div>
                                <div className="col-span-10 text-center lg:col-span-3 w-full">
                                    <Button
                                        className="w-full"
                                        disabled={isLoading}
                                        onClick={() => { setChapters(undefined), setVideoInfos(undefined), form.reset() }}
                                    >
                                        Restart
                                    </Button>
                                </div>
                            </div>
                    }
                </>
            }
            <div className="px-4 lg:px-8">

                <div className="space-y-4 mt-4">
                    {messages.length === 0 && !isLoading && (
                        <Empty label="No conversations started." />
                    )}
                    <div className="flex flex-col-reverse gap-y-4">
                        {messages.map((message) => (
                            <div
                                key={message.content}
                                className={cn(
                                    "p-8 w-full flex items-start gap-x-8 rounded-lg",
                                    message.role === "user" ? "bg-white border border-black/10" : "bg-muted"
                                )}
                            >
                                {message.role === "user" ? <UserAvatar /> : <BotAvatar />}
                                <p className="text-sm">
                                    {message.content}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DashboardPage;