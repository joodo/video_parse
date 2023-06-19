import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    try {
        const response = await axios.get('https://passport.bilibili.com/x/passport-login/captcha?source=main_web');

        if (response.data['code'] != 0) {
            throw new Error(`Captcha fetch failed: ${response.data}`);
        }
        res.status(200).json(response.data['data']);
    } catch (err) {
        if (err instanceof Error) {
            res.status(400).json(err.message);
        }
    }
}
