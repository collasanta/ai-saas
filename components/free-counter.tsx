"use client"

import { useEffect, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { MAX_FREE_COUNTS } from "@/constants";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { Zap } from "lucide-react";
import { useProModal } from "@/hooks/use-pro-modal";
import { getApiLimit } from "@/lib/api-limit";
import { redirect } from 'next/navigation';
import Link from 'next/link';


interface FreeCounterProps {
    apiLimitCount: number;
    apiLimit: number;
    isPro: boolean;
    dark?: boolean;
}

const FreeCounter = ({ apiLimitCount = 0, apiLimit = 3, isPro = false, dark = false
}: FreeCounterProps) => {
    const [mounted, setMounted] = useState(false)
    const proModal = useProModal()
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    return (
        <div className="px-3">
            <Card className={dark ? "bg-gray border-0" : "bg-white/10 border-0" }>
                <CardContent className="py-6">
                    <div className={dark ? "text-center text-sm text-gray-800 mb-4 space-y-2":"text-center text-sm text-white mb-4 space-y-2"}>
                        <p>
                            {apiLimitCount} / {apiLimit} {apiLimit > 3 ? "Credits" : "Free Credits"}
                            <Progress
                                className="h-3"
                                value={(apiLimitCount / apiLimit) * 100}
                            />
                        </p>
                    </div>

                    {isPro ?
                    <Link href="https://c9eqb45m7pt.typeform.com/to/RxzJlE9D" rel="noopener noreferrer" target="_blank">
                        <Button variant="premium" className="w-full">
                            Buy More Credits
                            <Zap className="w-4 h-4 ml-2 fill-white" />
                        </Button>
                    </Link> 
                    :
                        <Button onClick={proModal.onOpen} variant="premium" className="w-full">
                            Buy More Credits
                            <Zap className="w-4 h-4 ml-2 fill-white" />
                        </Button>
                    }

                </CardContent>
            </Card>
        </div>
    );
}

export default FreeCounter;