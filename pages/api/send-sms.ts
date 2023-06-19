import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'node:crypto'
import axios from 'axios';
import querystring from 'querystring';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== 'POST') {
        res.status(405).send({ message: 'Only POST requests allowed' })
        return
    }

    try {
        console.log(req.body);
        const {
            tel,
            token,
            challenge,
            validate,
            seccode,
        } = req.body;

        const payload = {
            cid: 1,
            tel,
            source: 'main_web',
            token,
            challenge,
            validate,
            seccode,
        };
        const response = await axios.post(
            'https://passport.bilibili.com/x/passport-login/web/sms/send',
            querystring.stringify(payload),
        );
        if (response.data['code'] != 0) {
            console.error(response.data);
            throw new Error('send failed.');
        }

        res.status(200).json('send success');
    } catch (err) {
        if (err instanceof Error) {
            res.status(400).json(err.message);
        }
    }
}
