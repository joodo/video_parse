// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios';

type VideoInfo = {
  title: string,
  bvid: string,
  aid: string,
  cid: string,
  pic: string,
  p: number,
  totalP: number,
}

type UrlInfo = {
  isHD: boolean,
  urls: string[],
}

type VideoBV = {
  bvid: string,
  p: number,
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { url, bvid, p } = req.query;
  try {
    let bv: VideoBV;
    if (typeof url === 'string') {
      bv = await parseBV(new URL(decodeURI(url)));
    } else if (typeof bvid === 'string') {
      bv = {
        bvid,
        p: parseInt(p?.toString() ?? 'NaN'),
      }
    } else {
      throw new Error('"url" or "bvid" param is required.');
    }

    const videoInfo = await getVideoInfo(bv);
    const videoUrls = await getVideoUrls(videoInfo);

    const isOutDated = await isLoginOutdated();
    if (isOutDated) {
      // TODO: send email
    }

    const urlInfo: UrlInfo = {
      isHD: !isOutDated,
      urls: videoUrls,
    }

    res.status(200).json({
      videoInfo,
      urlInfo,
    })
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json(err.message);
    }
  }
}

async function parseBV(url: URL): Promise<VideoBV> {
  switch (url.host) {
    case 'b23.tv':
      try {
        const redirectUrl = await axios.get(
          url.toString(),
          { maxRedirects: 0 },
        ).catch(error => {
          return error.response.headers.location;
        });
        return parseBV(new URL(redirectUrl));
      } catch (e) {
        throw new Error('Redirect short link error.');
      }
    case 'www.bilibili.com':
      const regex = /\/BV(?<bvid>[A-Za-z0-9]*)\/?/;
      const found = url.pathname.match(regex);
      if (found === null) throw new Error('No bv found in url');
      const { bvid } = found.groups!;

      const p = parseInt(url.searchParams.get('p') ?? '');
      return { bvid, p };
    default: throw new Error(`Unknown host: ${url.host}`);
  }
}

async function getVideoInfo(bv: VideoBV): Promise<VideoInfo> {
  const response = await axios.get(`https://api.bilibili.com/x/web-interface/view?bvid=${bv.bvid}`);
  if (response.data['code'] != 0) throw new Error(`Cannot get video info: BV=${bv.bvid}, p=${bv.p}`);

  const { title, aid, pic, pages } = response.data.data;
  const totalP = pages.length;
  const pIndex = bv.p > 0 && bv.p <= totalP ? bv.p - 1 : 0;
  const { cid } = pages[pIndex];
  return { title, aid, pic, cid, totalP, ...bv, };
}

async function getVideoUrls(info: VideoInfo): Promise<string[]> {
  const response = await axios.get(
    `https://api.bilibili.com/x/player/playurl?avid=${info.aid}&cid=${info.cid}&qn=112`,
    { headers: { "Cookie": `SESSDATA=${process.env.SESSDATA}` } }
  );
  const durl = response.data.data.durl[0];
  return [
    durl['url'],
    ...durl['backup_url'],
  ];
}

async function isLoginOutdated() {
  const response = await axios.get(
    'https://passport.bilibili.com/x/passport-login/web/cookie/info',
    { headers: { "Cookie": `SESSDATA=${process.env.SESSDATA}` } }
  );
  return response.data.data.refresh;
}
