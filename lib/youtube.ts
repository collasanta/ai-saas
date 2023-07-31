'use server'
import * as yt from 'youtube-info-streams';
import getVideoId from 'get-video-id';

export interface YoutubeVideoInfo {
    languages: string | null;
    videoLengthMinutes: number;
    videoLenghtFormatted: string;
    videoTitle: string;
    videoChannelName: string;
    videoThumb: string;
  }

export const getYoutubeVideoInfos = async (url: string): Promise<YoutubeVideoInfo>=> {
    const { id } = getVideoId(url);
    if (id === null) {
        throw new Error('Invalid Youtube URL');
    }
    const videoInfos = await yt.info(id);
    const videoThumbs = videoInfos.videoDetails.thumbnail.thumbnails
    const videoThumb = videoThumbs[videoThumbs.length -1].url
    const videoLenghtSeconds = videoInfos.videoDetails.lengthSeconds
    const videoLenghtFormatted = `${String(Math.floor(videoLenghtSeconds / 60)).padStart(2)}min ${String(videoLenghtSeconds % 60).padStart(2, '0')}sec`;
    const videoLengthMinutes = Math.round(videoLenghtSeconds / 60)
    const videoTitle = videoInfos.videoDetails.title
    const videoChannelName = videoInfos.videoDetails.ownerChannelName
    // console.log("videoInfos.player_response.captions", videoInfos.player_response.captions)
    if (videoInfos.player_response.captions.playerCaptionsTracklistRenderer === undefined){
        return { languages:null, videoLengthMinutes, videoLenghtFormatted, videoTitle, videoChannelName, videoThumb }
    }
    let captions = videoInfos.player_response.captions.playerCaptionsTracklistRenderer.captionTracks
    let languages = ""
    let filter = captions.map((caption: any) => { languages = languages + " " + caption.languageCode })
    return { languages, videoLengthMinutes, videoLenghtFormatted, videoTitle, videoChannelName, videoThumb }
}