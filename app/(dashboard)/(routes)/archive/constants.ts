import * as z from "zod"

export const formSchema = z.object({
    ytlink: z.string().min(1, {
        message: "video link is required"
    }),
})