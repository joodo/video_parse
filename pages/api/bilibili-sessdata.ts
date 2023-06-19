import type { NextApiRequest, NextApiResponse } from 'next'
import { kv } from '@vercel/kv';
import { JSDOM } from 'jsdom';
import axios from 'axios';

type BiliHash = {
    SESSDATA: string,
    bili_jct: string,
    refresh_token: string,
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    try {
        const { key } = req.query;
        if (key !== process.env.BUNGA_KEY) {
            throw new Error('Wrong key.');
        }

        const cookies = await kv.hgetall('bilibili_cookies') as BiliHash;
        const sess = cookies.SESSDATA;

        const response = await axios.get(
            'https://passport.bilibili.com/x/passport-login/web/cookie/info',
            { headers: { 'Cookie': `SESSDATA=${sess}` } },
        );
        if (response.data['code'] != 0) {
            console.error(`failed to check cookie with sess ${sess}: ${JSON.stringify(response.data)}`);
            throw new Error('Failed to check cookie outdate.');
        }


        if (response.data.data.refresh) {
            // SESS out of date
            console.info('sess outdated.');
            const newSess = await updateCookie(cookies);
            res.status(200).json(newSess);
        } else {
            res.status(200).json(sess);
        }
    } catch (err) {
        if (err instanceof Error) {
            res.status(400).json(err.message);
        }
    }
}

async function updateCookie(cookies: BiliHash): Promise<string> {
    const correspondPath = await getCorrespondPath();
    const csrf = await getRefreshCsrf(cookies.SESSDATA, correspondPath);
    const newCookies = getNewCookie(cookies, csrf);
    return '';
}

async function getCorrespondPath(): Promise<string> {
    const publicKey = await crypto.subtle.importKey(
        "jwk",
        {
            kty: "RSA",
            n: "y4HdjgJHBlbaBN04VERG4qNBIFHP6a3GozCl75AihQloSWCXC5HDNgyinEnhaQ_4-gaMud_GF50elYXLlCToR9se9Z8z433U3KjM-3Yx7ptKkmQNAMggQwAVKgq3zYAoidNEWuxpkY_mAitTSRLnsJW-NCTa0bqBFF6Wm1MxgfE",
            e: "AQAB",
        },
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["encrypt"],
    )

    const data = new TextEncoder().encode(`refresh_${Date.now()}`);
    const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, data))
    return encrypted.reduce((str, c) => str + c.toString(16).padStart(2, "0"), "")
}

async function getRefreshCsrf(sess: string, correspondPath: string): Promise<string> {
    const url = `https://www.bilibili.com/correspond/1/${correspondPath}`;
    const response = await axios.get(url, { headers: { 'Cookie': `SESSDATA=${sess}` } });
    if (response.status != 200) {
        console.error(`failed to get csrf with correspondPath ${correspondPath}: response code ${response.status}`);
        throw new Error('Failed to check cookie outdate.');
    }

    const dom = new JSDOM(response.data, { runScripts: "dangerously" });
    const csrf = dom.window.document.evaluate(
        "//div[@id='1-name']/text()",
        dom.window.document,
        null,
        dom.window.XPathResult.STRING_TYPE,
        null,
    ).stringValue;
    return csrf;
}

async function getNewCookie(oldCookie: BiliHash, csrf: string): Promise<BiliHash> {
    const response = await axios.post(
        'https://passport.bilibili.com/x/passport-login/web/cookie/refresh',
        {
            csrf: oldCookie.bili_jct,
            refresh_csrf: csrf,
            source: 'main_web',
            refresh_token: oldCookie.refresh_token,
        },
        { headers: { 'Cookie': `SESSDATA=${oldCookie.SESSDATA}` } },
    );
    if (response.data['code'] != 0) {
        console.error(`failed to update cookie with sess ${oldCookie.SESSDATA}, bili_jct ${oldCookie.bili_jct}, refresh_token ${oldCookie.refresh_token}, csrf ${csrf}: ${JSON.stringify(response.data)}`);
        throw new Error('Failed to update cookie.');
    }

    console.log(response.headers['set-cookie']);
    return {
        refresh_token: response.data['data']['refresh_token'],
        SESSDATA: '',
        bili_jct: '',
    };
}
