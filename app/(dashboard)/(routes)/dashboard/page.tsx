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
    const [chapters, setChapters] = useState<JSONResponse>()
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
            const chaptersResponse = await axios.post("/api/chapters/generate/openai", promptInfos)
            if (chaptersResponse.status === 200) {
                await increaseApiLimit(videoInfos?.videoLengthMinutes!)
                setApiLimitCount(await getApiLimitCount())
            }
            const stringfiedJSONResponse = chaptersResponse.data.function_call.arguments
            await saveResponseDB(promptInfos.tokensCount, promptInfos.aiModel, videoInfos?.generationId!, stringfiedJSONResponse)
            
            const jsonResponse = JSON.parse(stringfiedJSONResponse)
            console.log("jsonResponse", jsonResponse)

            const JSONResponse2 = {
                "chapters": [
                    {
                        "timestamp": "0:00",
                        "chapter": "Introduction"
                    },
                    {
                        "timestamp": "0:08",
                        "chapter": "Being a Palestinian Christian"
                    },
                    {
                        "timestamp": "0:37",
                        "chapter": "Coexistence of Christians and Muslims in Palestine"
                    },
                    {
                        "timestamp": "0:51",
                        "chapter": "Difficulties due to tension between Israel and Palestine"
                    },
                    {
                        "timestamp": "1:17",
                        "chapter": "Hope for the future"
                    }
                ],
                "videoReview": "The video transcript features a Palestinian Christian discussing the tension and coexistence between different religions in Palestine. The speaker explains that many people are surprised to see a Palestinian who is a Christian, but Christianity has existed in Palestine since the time of Jesus. The speaker also mentions the difficulties faced due to the tension between Israel and Palestine. However, they express hope for the future, emphasizing the importance of love among the three major religions.",
                "keywords": [
                    "Palestinian Christian",
                    "tension",
                    "coexistence",
                    "Israel",
                    "Palestine",
                    "hope",
                    "love",
                    "religions"
                ]
            }
            console.log("JSONResponse2",JSONResponse2)

            // setChapters(JSONResponse)
            // console.log({ JSONResponse })
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
                    <Loader gen={videoInfos!!} />
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
                        !chapters ?
                            <div className="rounded-lg border w-full p-4 px-3 md:px-6 focus-within:shadow-sm grid grid-cols-10 gap-2">
                                <div className="col-span-10 lg:col-span-7">
                                    <div className="m-0 p-0">
                                        <div
                                            className="mx-auto border-0 flex flex-col md:flex-row bg-muted rounded-lg "
                                        >
                                            <div className="max-w-[280px] my-auto mx-auto px-3 py-4 ">
                                                <img src={videoInfos.videoThumb} alt="thumbnail" className="rounded-lg mx-auto" />
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
                            <div className="rounded-lg border w-full p-4 px-3 md:px-6 focus-within:shadow-sm grid grid-cols-10 gap-2">
                                <div className="col-span-10 lg:col-span-7">
                                    <div className="m-0 p-0">
                                        <div
                                            className="mx-auto border-0 flex flex-col md:flex-row bg-muted rounded-lg "
                                        >
                                            <div className="max-w-[280px] my-auto mx-auto px-3 py-4 ">
                                                <img src={videoInfos.videoThumb} alt="thumbnail" className="rounded-lg mx-auto" />
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