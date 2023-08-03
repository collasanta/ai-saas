declare global {
  interface Window {
    gtag:any;
  }
}

export const pageview = (GA_MEASUREMENT_ID : string, url : string) => {
  console.log("window.gtag->page_path: url", url)
  window.gtag("config", GA_MEASUREMENT_ID, {
      page_path: `${process.env.NEXT_PUBLIC_APP_URL}${url}`,
  });
};