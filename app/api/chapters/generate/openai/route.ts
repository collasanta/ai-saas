import { Configuration, OpenAIApi } from 'openai-edge'
import { OpenAIStream, StreamingTextResponse } from 'ai'
import { IPromptInfos } from '@/lib/youtube'

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
})
const openai = new OpenAIApi(config)

export const runtime = 'edge'

export async function POST(req: Request) {
  console.time("OpenAI API rout full time")
  const promptInfos: IPromptInfos = await req.json()
  
  
  const prompt = `Analyze and interpret this video: ${promptInfos.formattedSubtitles}`

  let Functions = [
    {
      "name": "video_interpreter",
      "description": "This functions takes a video and creates a list of chapters, a video review, and a list of keywords based on the video.",
      "parameters": {
        // SCHEMA:
        "type": "object",
        "properties": {
          "chapters": {
            "type": "array",
            "description": `An array of objects decribing the most relevant parts of the video, the array max lenght must be ${promptInfos.listItemsCount}.`,
            "items": {
              "type": "object",
              "description": "object with timestamp and a descriptive chapter",
              "properties": {
                "timestamp": {
                  "type": "string",
                  "description": "timestamp in the format of minutes:seconds",
                },
                "chapter": {
                  "type": "string",
                  "description": "A descriptive chapter name",
                }
              }
            },
          },
          "videoReview": {
            "type": "string",
            "description": "A one paragraph review of the content of the video"
          },
          "keywords": {
            "type": "array",
            "description": "A list of SEO keywords that describe the content of the video to better rank at Youtube",
            "items": { "type": "string" }
          }
        },
        "required": ["chapters", "videoReview", "keywords"]
      }
    }
  ]

  const response = await openai.createChatCompletion({
    model: promptInfos.aiModel,
    stream: true,
    temperature: 0,
    messages: [
      { role: "system", "content": "You are a helpful reader and interpreter" },
      { role: "user", content: prompt }],
    functions: Functions,
    function_call: { name: "video_interpreter" }
  })

  // let GPTResponse
  const stream = OpenAIStream(response, {
    onCompletion: async (completion: string) => {
      console.timeEnd("OpenAI API rout full time")
      // const transformToJson = await JSON.parse(completion)
      // GPTResponse = transformToJson.function_call.arguments
      // console.log({ GPTResponse })
    }
  })
  return new StreamingTextResponse(stream)
}