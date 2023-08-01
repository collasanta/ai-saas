import Stripe from "stripe"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { setTimeout } from "timers/promises";
import prismadb from "@/lib/prismadb"
import { stripe } from "@/lib/stripe"

export async function POST(req: Request) {
    const body = await req.text()
    const signature = headers().get("Stripe-Signature") as string
    let event: Stripe.Event

    try {
        event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch (error: any) {
        return new NextResponse(`Webhook Error:  ${error.message}`, { status: 400 })
    }

    // // SUBSCRIPTION BASED API *************************************************
    // if (event.type === "checkout.session.completed") {
    //     const session = event.data.object as Stripe.Checkout.Session
    //     console.log("session.customer0", session.customer)
    //     const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

    //     if (!session?.metadata?.userId) {
    //         return new NextResponse("User id is required", { status: 400 })
    //     }

    //     await prismadb.userSubscription.create({
    //         data: {
    //             userId: session?.metadata?.userId,
    //             stripeSubscriptionId: subscription.id,
    //             stripeCustomerId: subscription.customer as string,
    //             stripePriceId: subscription.items.data[0].price.id,
    //             stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
    //         }
    //     })

    //     await stripe.customers.update(
    //         subscription.customer as string as string,
    //         { metadata: { user_id: session.metadata.userId } }
    //     );
    // }

    // if (event.type === "invoice.payment_succeeded") {
    //     const session = event.data.object as Stripe.Invoice
    //     console.log("waiting")
    //     await setTimeout(5000);
    //     console.log("done")
    //     const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
    //     await prismadb.userSubscription.update({
    //         where: {
    //             stripeSubscriptionId: subscription.id
    //         },
    //         data: {
    //             stripePriceId: subscription.items.data[0].price.id,
    //             stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),        
    //         }    
    //     })

    //     const getUserId = await prismadb.userSubscription.findUnique({
    //         where: {
    //             stripeSubscriptionId: subscription.id
    //         }
    //     })

    //     await prismadb.userCredits.create({
    //         data: {
    //             userId: getUserId?.userId!,
    //             credits: 50,
    //             plan: "basic",
    //         }
    //     })
    // }


    // // CREDIT BASED API *************************************************
    // const creditSession = event.data.object as Stripe.Charge


    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session
        console.log("event 2", event)

        if (!session?.metadata?.userId) {
            return new NextResponse("User id is required", { status: 400 })
        }

        await prismadb.userCredits.create({
            data: {
                userId: session?.metadata?.userId,
                paymentIntent: session?.payment_intent as string,
            }
        })
    }

    if (event.type === "charge.succeeded") {
        const session = event.data.object as Stripe.Charge
        await setTimeout(5000);
        await prismadb.userCredits.update({
            where: {
                paymentIntent: session?.payment_intent as string
            },
            data: {
                credits: {
                    increment: 1000
                }
            }
        })
    }

    return new NextResponse(null, { status: 200 })
}
