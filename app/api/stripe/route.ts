import { auth, currentUser } from "@clerk/nextjs"
import { NextResponse } from "next/server"

import prismadb from "@/lib/prismadb"
import { stripe } from "@/lib/stripe"
import { absoluteUrl } from "@/lib/utils"

const settingsUrl = absoluteUrl("/settings")

export async function GET() {
    try {
        const {userId} = auth()
        const user = await currentUser()

        if (!userId || !user) {
            return new NextResponse("Unauthorized", {status:401})
        }

        const userSubscription = await prismadb.userSubscription.findUnique({
            where:{userId}
        })

        if (userSubscription && userSubscription.stripeCustomerId){
            const stripeSession = await stripe.billingPortal.sessions.create({
                customer: userSubscription.stripeCustomerId,
                return_url: settingsUrl,
            })

            return new NextResponse(JSON.stringify({url:stripeSession.url}))
        } 

        const stripeSession = await stripe.checkout.sessions.create({
            success_url: settingsUrl,
            cancel_url: settingsUrl,
            payment_method_types: ["card"],
            mode: "payment",
            billing_address_collection:"auto",
            customer_email: user.emailAddresses[0].emailAddress,
            line_items: [
                {
                    price_data: {
                        currency: "USD",
                        product_data: {
                            name: "ChadChapters Pro Package",
                            description:"Add 1000 credits (ONE TIME PAYMENT)",
                            images:["https://chadchapters.com/logo.png"],
                        },
                        unit_amount: 1000,
                    },
                    quantity: 1,
                }
            ],
            metadata:{ userId },
        })

        // const monthlyStripeSession = await stripe.checkout.sessions.create({
        //     success_url: settingsUrl,
        //     cancel_url: settingsUrl,
        //     payment_method_types: ["card"],
        //     // mode: "payment",
        //     mode: "subscription",
        //     billing_address_collection:"auto",
        //     customer_email: user.emailAddresses[0].emailAddress,
        //     line_items: [
        //         {
        //             price_data: {
        //                 currency: "USD",
        //                 product_data: {
        //                     name: "Pro Package",
        //                     description:"Add 50 credits per month + Long videos support",
        //                 },
        //                 unit_amount: 1000,
        //                 recurring:{
        //                     interval:"month"
        //                 }
        //             },
        //             quantity: 1,
        //         }
        //     ],
        //     metadata:{ userId },
        // })

        return new NextResponse(JSON.stringify({url:stripeSession.url}))
        
    } catch (error) {
        console.log("[STRIPE_ERROR]", error)
        return new NextResponse("Internal Error", {status:500})
    }
}