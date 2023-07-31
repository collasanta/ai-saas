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
import axios from "axios";
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
import { getApiLimit, getApiLimitCount } from "@/lib/api-limit";
import { IYoutubeVideoInfo, getYoutubeVideoInfos } from "@/lib/youtube";
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

    const isLoading = form.formState.isSubmitting;

    const [apiLimitCount, setApiLimitCount] = useState(0)
    const [apiLimit, setApiLimit] = useState(3)
    const [videoInfos, setVideoInfos] = useState<IYoutubeVideoInfo>()
    const [chapters, setChapters] = useState()

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
        try {
            const infos = await getYoutubeVideoInfos(values.ytlink)
            setVideoInfos(infos)
            console.log("infos", infos)
        } catch (error: any) {
            console.log("error: ", error.message)
            toast.error(`Something went wrong: ${error.message}`)
        } finally {
            router.refresh()
        }
        console.log(values)
    }

    // const generateChapters = async () => {
    //     try {
    //         getYoutubeVideoChapters()
    //         const response = await axios.post("/api/chapters/generate", {
    //             youtubeId: videoInfos?.videoId
    //         })
    //         setChapters(chapters)
    //     } catch (error: any) {
    //         if (error?.response?.status === 403) {
    //             proModal.onOpen()
    //         } else {
    //             console.log("error: ", error.message)
    //             toast.error("something went wrong")
    //         }
    //     } finally {
    //         router.refresh()
    //     }
    // }

    return (
        <div>
            <Heading
                title="Youtube Chapters"
                description="Generate chapters for your youtube videos in seconds"
                icon={Youtube}
                iconColor="text-emerald-500"
                bgColor="bg-emerald-500/10"
            />
            <div>
                <FreeCounter dark={true} hideButton={true} tight={true} apiLimit={apiLimit} apiLimitCount={apiLimitCount} />
            </div>
            <div className="px-4 lg:px-8">
                {!videoInfos ?
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(loadVideoInfos)}
                            className="rounded-lg border w-full p-4 px-3 md:px-6 focus-within:shadow-sm grid grid-cols-12 gap-2"
                        >
                            <FormField
                                name="ytlink"
                                render={({ field }) => (
                                    <FormItem className="col-span-12 lg:col-span-10">
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
                                className="col-span-12 lg:col-span-2 w-full"
                                disabled={isLoading}
                            >
                                Generate
                            </Button>
                        </form>
                    </Form>
                    :

                    <div className="rounded-lg border w-full p-4 px-3 md:px-6 focus-within:shadow-sm grid grid-cols-12 gap-2">
                        <div className="col-span-12 lg:col-span-8">
                            <div className="m-0 p-0">
                                <div
                                    className="mx-auto border-0 flex flex-col md:flex-row bg-[#111827] rounded-lg"
                                >
                                    <div className="md:max-w-[250px] my-auto mx-auto px-3 py-4 ">
                                        <img src={videoInfos.videoThumb} alt="thumbnail" className="rounded-lg mx-auto" />
                                    </div>
                                    <div className="flex flex-col justify-center md:justify-start text-center pb-4 md:pr-6 md:py-4 rounded-lg">
                                        <p className="text-white font-semibold">{videoInfos.videoTitle}</p>
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
                        <div className="col-span-12 text-center lg:col-span-4 w-full">
                            <Button
                                className="w-full"
                                disabled={isLoading}
                                onClick={() => console.log("oi")}
                            >
                                Generate
                            </Button>
                        </div>
                    </div>

                }

                <div className="space-y-4 mt-4">
                    {isLoading && (
                        <div className="p-8 rounded-lg w-full flex items-center justify-center bg-muted">
                            <Loader />
                        </div>
                    )}
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