"use client";
import Link from "next/link";
import Image from "next/image";
import { Montserrat } from "next/font/google";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FolderSearch, Settings } from "lucide-react";
import {usePathname} from "next/navigation"
import FreeCounter from "./free-counter";

const montserrat = Montserrat({ weight: "600", subsets: ["latin"] })

const routes = [
    {
        label:"Dashboard",
        icon: LayoutDashboard,
        href: "/dashboard",
        color: "text-sky-500"
    },
    {
        label:"Archive",
        icon: FolderSearch,
        href: "/archive",
        color: "text-emerald-500"
    },
    {
        label:"Settings",
        icon: Settings,
        href: "/settings",
    },
]

interface SidebarProps {
    apiLimitCount: number,
    apiLimit: number,
    isPro: boolean
}
const Sidebar = ({
    apiLimitCount = 0,
    apiLimit = 3,
    isPro = false
}: SidebarProps) => {
    const pathname = usePathname()
    return (
        <div className="space-y-4 py-4 flex flex-col h-full bg-[#111827] text-white">
            <div className="px-3 py-2 flex-1">
                <Link href="/dashboard" className="flex items-center pl-3 mb-14">
                    <div className="relative w-16 h-16 ">
                        <Image src="/logo.png" fill alt="logo" />
                    </div>
                    <h1 className={cn("text-2xl font-bold", montserrat.className)}>
                        ChadChapters
                    </h1>
                </Link>
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link href={route.href} key={route.href} className={cn(
                            "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                            pathname === route.href ? "text-white bg-white/10" : "text-zinc-400"
                            )}>
                            <div className="flex items-center flex-1">
                                <route.icon className={cn("w-5 h-5 mr-3", route.color)} />
                                {route.label}
                            </div>
                        </Link>
                    ))}

                </div>
            </div>
            <FreeCounter 
                apiLimit={apiLimit}
                apiLimitCount={apiLimitCount}
            />
        </div>
    );
}

export default Sidebar;