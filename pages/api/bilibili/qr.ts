import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    try {
        const response = await axios.get('https://passport.bilibili.com/x/passport-login/web/qrcode/generate');
        if (response.data['code'] != 0) {
            console.error(response.data);
            throw new Error('request qr failed.');
        }

        res.status(200).json(response.data['data']);
    } catch (err) {
        if (err instanceof Error) {
            res.status(400).json(err.message);
        }
    }
}
