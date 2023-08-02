import Image from "next/image"

export const Loader = ({gen}:{gen:boolean}) => {
    return (
        <div className="h-full flex flex-col items-center text-center justify-center" data-tooltip-target="tooltip"> 
            <div className="w-10 h-20 relative mb-2 ">
                <Image
                alt="logo"
                fill
                src="/loading.gif"
                />
            </div>
            <a className="text-sm text-muted-foreground font-semibold">
                loading...
            </a>
            {gen && (
                <>
                    <a className="text-[12px] text-muted-foreground">
                        Chad is watching your video
                    </a>
                    <a id="tooltip" className="text-[11px] mt-2 italic text-muted-foreground">
                        *Chapters are saved on the Archives section
                    </a>
                </>
            )
            }

        </div>
    )
}