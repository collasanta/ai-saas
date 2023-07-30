"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const testimonials = [
  {
    name: "Watchers",
    avatar: "A",
    title: "Designer",
    description: "Know beforehand what is the video content, and skip to the part you want to watch",
  },
  {
    name: "Channel Owners",
    avatar: "J",
    title: "Software Engineer",
    description: "Save hours of manual work and let your audience happy by creating captions for your Videos",
  },
  {
    name: "Podcasters",
    avatar: "M",
    title: "CEO",
    description: "Generate chapters for your podcast and make it more accessible to your audience",
  },
];

export const LandingContent = () => {
  return (
    <div className="px-10 pb-20">
      <h2 className="text-center text-4xl text-white font-extrabold mb-10">Making your life easier</h2>
      <div className="grid justify-center grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
        {testimonials.map((item) => (
          <Card key={item.description} className="bg-[#192339] border-none text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-x-2">
                <div>
                  <p className="text-zinc-400 text-sm">Youtube</p>
                  <p className="text-lg">{item.name}</p>
                </div>
              </CardTitle>
              <CardContent className="pt-4 px-0">
                {item.description}
              </CardContent>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}