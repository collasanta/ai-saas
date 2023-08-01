export interface JSONResponse {
    chapters: {
      timestamp: string;
      chapter: string;
    }[];
    videoReview: string;
    keywords: string[];
}