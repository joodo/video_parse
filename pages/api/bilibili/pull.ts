import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios';
import { kv } from '@vercel/kv';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    try {
        const { qrcode_key } = req.query;
        const response = await axios.get(
            `https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key=${qrcode_key}`
        );
        if (response.data['code'] != 0) {
            console.error(response.data);
            throw new Error('pull qr status failed.');
        }

        const { refresh_token, code } = response.data['data'];
        if (code == 0) {
            const m = parseSetCookie(response.headers['set-cookie'] as string[]);
            const payload = {
                SESSDATA: m.get('SESSDATA'),
                bili_jct: m.get('bili_jct'),
                refresh_token,
            }
            console.info(`login info: ${JSON.stringify(payload)}`);
            await kv.hset('bilibili_cookies', payload);
        }

        res.status(200).json({ status: code });
    } catch (err) {
        if (err instanceof Error) {
            res.status(400).json(err.message);
        }
    }
}

function parseSetCookie(headers: string[]): Map<string, string> {
    let re = new Map();
    headers.map(e => {
        const record = e.split(';')[0].split('=');
        re.set(record[0], record[1]);
    });
    return re;
}
