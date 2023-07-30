"use client"

import { useProModal } from "@/hooks/use-pro-modal"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"
import { Badge } from "./ui/badge"
import { Check, MessageSquare, Zap, Timer } from "lucide-react"
import { Card } from "./ui/card"
import { cn } from "@/lib/utils"
import { Button } from "./ui/button"
import axios from "axios"
import { useState } from "react"

const benefits = [
    {
        label: "Add 50 Credits",
        icon: MessageSquare,
        color: "text-emerald-500",
        bgColor: "bg-emerald-500/10",
    },
    {
        label: "Long Videos Support",
        icon: Timer,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
    },
    // {
    //     label: "100 Generations",
    //     icon: MessageSquare,
    //     color: "text-emerald-500",
    //     bgColor: "bg-emerald-500/10",
    // },
]

export const ProModal = () => {
    const proModal = useProModal()
    const [loading, setLoading] = useState(false)

    const onSubscribe = async () => {
    try {
        setLoading(true)
        const response = await axios.get("/api/stripe")
        window.location.href = (response).data.url
    } catch(error){
        console.log(error)
    } finally{
        setLoading(false)
    }
    }

    return (
        <Dialog open={proModal.isOpen} onOpenChange={proModal.onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex justify-center items-center flex-col gap-y-4 pb-2">
                        <div className="flex items-center gap-x-2 font-bold py-1">
                            Upgrade Your Plan
                            <Badge variant="premium" className="uppercase text-sm py-1">
                                Pro
                            </Badge>
                        </div>
                    </DialogTitle>
                    <DialogDescription className="text-center pt-2 space-y-2 text-zinc-900 font-medium">
                        {benefits.map((benefit) => (
                            <Card
                                key={benefit.label}
                                className="p-3 border-black/5 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-x-4">
                                    <div className={cn("p-2 w-fit rounded-md", benefit.bgColor)}>
                                        <benefit.icon className={cn("w-6 h-6", benefit.color)} />
                                    </div>
                                    <div className="font-semibold test-sm">
                                        {benefit.label}
                                    </div>
                                </div>
                                <Check className="text-primary w-5 h-5" />
                            </Card>
                        ))}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter >
                    <Button  onClick={onSubscribe} disabled={loading} variant="premium" size="lg" className="w-full"> 
                    Buy More Credits
                        <Zap className="w-4 h-4 ml-2 fill-white" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}