"use client"

import { useEffect, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { MAX_FREE_COUNTS } from "@/constants";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { Zap } from "lucide-react";
import { useProModal } from "@/hooks/use-pro-modal";



interface FreeCounterProps {
    apiLimitCount: number;
    apiLimit: number;
    hideButton?: boolean;
    dark?: boolean;
    tight?: boolean;
}

const FreeCounter = ({ apiLimitCount = 0, apiLimit = MAX_FREE_COUNTS, hideButton = false, dark = false, tight = false
}: FreeCounterProps) => {
    const [mounted, setMounted] = useState(false)
    const proModal = useProModal()
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    return (
        <div className={tight ? "px-1 max-w-[1000px] mx-auto" : "px-3  "}>
            <Card className={dark ? "bg-gray border-0 shadow-none px-8" : "bg-white/10 border-0" }>
                <CardContent className={tight ? "py-1" : "py-6"}>
                    <div className={dark ? "text-center text-sm text-gray-600 mb-4 space-y-2":"text-center text-sm text-white mb-4 space-y-2"}>
                        <p>
                            {apiLimitCount} / {apiLimit} {apiLimit > 3 ? "Credits" : "Free Credits"}
                            <Progress
                                className="h-3"
                                value={(apiLimitCount / apiLimit) * 100}
                            />
                        </p>
                    </div>

                    {!hideButton &&
                    
                        <Button variant="premium" onClick={()=>proModal.onOpen()} className="w-full">
                            Buy Credits
                            <Zap className="w-4 h-4 ml-2 fill-white" />
                        </Button>
                    }

                </CardContent>
            </Card>
        </div>
    );
}

export default FreeCounter;