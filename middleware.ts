import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { env } from "process";

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/nextjs/middleware for more information about configuring your middleware

export default authMiddleware({
    publicRoutes:["/", "/api/webhook"],
    afterAuth: async (auth, req) => {
      if(auth.userId && req.url === `${env.NEXT_PUBLIC_APP_URL}/`){
        const orgSelection = new URL('/dashboard', req.url)
        console.log("redirected")
        return NextResponse.redirect(orgSelection)
      }
    }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};