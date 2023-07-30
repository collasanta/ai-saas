"use client"
import Heading from "@/components/heading";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { MessageSquare, Youtube } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod";
import { formSchema } from "../archive/constants"
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useRouter } from "next/navigation";
import { ChatCompletionRequestMessage } from "openai";
import { useState } from "react";
import { Empty } from "@/components/empty";
import { Loader } from "@/components/loader";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { BotAvatar } from "@/components/bot-avatar";
import { useProModal } from "@/hooks/use-pro-modal";
import toast from "react-hot-toast";
import FreeCounter from "@/components/free-counter";

const ArchivePage = () => {
    const router = useRouter()
    const proModal = useProModal()
    const [messages, setMessages] = useState<ChatCompletionRequestMessage[]>([])
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            prompt: ""
        }
    })

    const isLoading = form.formState.isSubmitting;

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {            
            const userMessage: ChatCompletionRequestMessage = {
                role: "user",
                content: values.prompt,
            }
            const newMessages = [...messages, userMessage]
            const response = await axios.post("/api/conversation", {
                messages: newMessages
            })
            setMessages((current) => [...current, userMessage, response.data])
            form.reset()
            console.log(response.data)
        } catch (error: any) {
            if (error?.response?.status === 403){
                proModal.onOpen()
            } else {
                toast.error("something went wrong")
            }
        } finally {
            router.refresh()
        }
        console.log(values)
    }

    return (
        <div>
            <Heading
                title="Youtube Chapters"
                description="Generate chapters for your youtube videos in seconds"
                icon={Youtube}
                iconColor="text-emerald-500"
                bgColor="bg-emerald-500/10"
            />
            <div clas>
                <FreeCounter dark={true} hideButton={true} tight={true} />
            </div>
            <div className="px-4 lg:px-8">
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="rounded-lg border w-full p-4 px-3 md:px-6 focus-within:shadow-sm grid grid-cols-12 gap-2"
                    >
                        <FormField
                            name="prompt"
                            render={({ field }) => (
                                <FormItem className="col-span-12 lg:col-span-10">
                                    <FormControl className="m-0 p-0">
                                        <Input
                                            className="pl-2 border-0 bg-[#F6F6F7] outline-none focus-visible:ring-0 focus-visible:ring-transparent"
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
            <div className="space-y-4 mt-4">
                {isLoading && (
                    <div className="p-8 rounded-lg w-full flex items-center justify-center bg-muted">
                        <Loader />
                    </div>
                )}
                {messages.length === 0 && !isLoading && (
                    <Empty label="No conversations started."/>
                )}
                <div className="flex flex-col-reverse gap-y-4">
                    {messages.map((message) => (
                        <div 
                            key={message.content}
                            className={cn(
                                "p-8 w-full flex items-start gap-x-8 rounded-lg",
                                message.role === "user" ? "bg-white border border-black/10" :"bg-muted" 
                                )}
                        >
                            {message.role === "user" ? <UserAvatar/> : <BotAvatar/>}
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

export default ArchivePage;