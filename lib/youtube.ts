'use server'
import * as yt from 'youtube-info-streams';
import getVideoId from 'get-video-id';
import { setTimeout } from "timers/promises";
var getSubtitles = require('youtube-captions-scraper').getSubtitles;
import { GPTTokens } from "gpt-tokens";

export interface IYoutubeVideoInfo {
    languages: string | null;
    videoLenghtSeconds: number;
    videoLengthMinutes: number;
    videoLenghtFormatted: string;
    videoTitle: string;
    videoChannelName: string;
    videoThumb: string;
    videoId: string;
}

export const getYoutubeVideoInfos = async (url: string): Promise<IYoutubeVideoInfo> => {
    console.log("init getYoutubeVideoInfos")
    console.time("getYoutubeVideoInfos")
    const { id } = getVideoId(url);
    if (id === null) {
        throw new Error('Invalid Youtube URL');
    }
    const videoInfos = await yt.info(id);
    const videoThumbs = videoInfos.videoDetails.thumbnail.thumbnails
    const videoThumb = videoThumbs[videoThumbs.length - 1].url
    const videoLenghtSeconds = videoInfos.videoDetails.lengthSeconds
    const videoLenghtFormatted = `${String(Math.floor(videoLenghtSeconds / 60)).padStart(2)}min ${String(videoLenghtSeconds % 60).padStart(2, '0')}sec`;
    const videoLengthMinutes = Math.round(videoLenghtSeconds / 60)
    const videoTitle = videoInfos.videoDetails.title
    const videoChannelName = videoInfos.videoDetails.ownerChannelName
    if (videoInfos.player_response.captions.playerCaptionsTracklistRenderer === undefined) {
        throw new Error('Sorry but we cant generate chapters for this video, try another one ;)');
    }
    let captions = videoInfos.player_response.captions.playerCaptionsTracklistRenderer.captionTracks
    let languages = ""
    let filter = captions.map((caption: any) => { languages = languages + " " + caption.languageCode })
    console.timeEnd("getYoutubeVideoInfos")
    return { languages, videoLenghtSeconds, videoLengthMinutes, videoLenghtFormatted, videoTitle, videoChannelName, videoThumb, videoId: id }
}

export const getPrompt = async (videoInfos: IYoutubeVideoInfo): Promise<any> => {
    const formattedSubtitles = await getFormattedSubtitles(videoInfos.videoId)

    const itensCount: any = await getListCount(`${videoInfos.videoLenghtSeconds}`)

    const tokensCount = await countTokens(formattedSubtitles)
    
    console.log("tokensCount", tokensCount)

    return tokensCount
}

async function getFormattedSubtitles(videoId: string) {
    let subs = await getSubtitles({
        videoID: videoId, // youtube video id
        // lang: selectedSub // default: `en`
    })


    let finalTimmedSubsArr = await Promise.all(subs.map(async (sub: any) => {
        // TESTE FUTURO
        //AQUI ROLA UMA POSSIVEL OTIMIZACAO. COMO? DIMINUINDO A FREQUENCIA DAS TIMESTAMPS (só voltar o tempo junto qdo for impar o contador por ex)

        let time = await convertSecondsToMinutesAndSeconds(sub.start.split(".")[0])
        let timedsub = time + " " + sub.text
        return timedsub
        async function convertSecondsToMinutesAndSeconds(timeInSeconds: string) {
            const minutes = Math.floor(+timeInSeconds / 60); // Get the number of minutes
            const seconds = +timeInSeconds % 60; // Get the number of remaining seconds
            const formattedMinutes = String(minutes) // Add leading zero if needed
            const formattedSeconds = String(seconds).padStart(2, '0'); // Add leading zero if needed
            const formattedTime = `${formattedMinutes}:${formattedSeconds}`; // Combine minutes and seconds with a colon
            return formattedTime; // Return the formatted time
        }
    }))

    const finalTimmedSubs = finalTimmedSubsArr.join(" ")
    return finalTimmedSubs
}

async function getListCount(totalSeconds: string) {
    if (+totalSeconds < 180) { //menor que 3 minutos
      return 3
    } else if (+totalSeconds >= 180 && +totalSeconds < 300) { //entre 3minutos e 5 minutos
      return 4
    } else if (+totalSeconds >= 300 && +totalSeconds < 360) { //entre 5minutos e 6 minutos
      return 5
    } else if (+totalSeconds >= 360 && +totalSeconds < 420) { //entre 6 minutos e 7 minutos
      return 6
    } else if (+totalSeconds >= 420 && +totalSeconds < 480) { //entre 7 minutos e 8 minutos
      return 7
    } else if (+totalSeconds >= 480 && +totalSeconds < 540) { //entre 8 minutos e 9 minutos
      return 8
    } else if (+totalSeconds >= 540 && +totalSeconds < 600) { //entre 8 minutos e 9 minutos
      return 9
    } else if (+totalSeconds >= 600) { //entre 9 minutos e 11 minutos
      return 10
    }
}

async function countTokens(subs:string) {
    subs.concat()
    const countWords = new GPTTokens({
      model: 'gpt-3.5-turbo-16k-0613',
      messages: [
        // {"role": "system", "content": "Você é um jornalista. Responda de forma concisa e usando uma linguagem de fácil entedimento"},
        {"role": "user", "content": `use essa transcrição de vídeo e faça uma lista de carimbo de data/hora de no máximo ${10} items, com os principais tópicos abordados.
        Cada tópico deve ter no mínomo 15 caracteres e no máximo 100 caracteres.
        A resposta deve estar no formato
        Pontos Chave:
        -tempo tópico 1 
        -tempo tópico 2
        (linha de espaço)
        Após isso, resuma o vídeo em um parágrafo e adicione ao final da resposta no seguinte formato:
        Resumo do vídeo:
        -Exemplo de resumo. 
        (linha de espaço)
        Após isso, crie palavras chave otimizdas para SEO e adicione-as ao final da resposta no seguinte formato:
        Palavras Chave:
        palavra1, ... palavra10,
        vídeo:${subs}.
        `}
        // {"role": "user", "content": `use essa transcrição de vídeo e faça uma lista de carimbo de data/hora de no máximo 10 itens, com os principais tópicos abordados.
        // Cada item da lista deve conter o carimbo de data/hora e o tópico abordado.
        // vídeo:${subs}.
        // `}
      ],
  })
    const InputTokenCount = countWords.usedTokens
    // const InputTokenCount = (subs.length/4) + 400 // 500 == equals prompt
    return InputTokenCount
  }