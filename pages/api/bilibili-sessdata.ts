import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    const { key } = req.query;

    if (key !== process.env.BUNGA_KEY) {
        res.status(400).json('Wrong key');
    } else {
        const sess = process.env.SESSDATA;
        const response = await axios.get(
            'https://passport.bilibili.com/x/passport-login/web/cookie/info',
            { headers: { "Cookie": `SESSDATA=${sess}` } }
        );
        if (response.data.data.refresh) {
            res.status(400).json('SESS out of date');
        } else {
            res.status(200).json(sess);
        }
    }

}
