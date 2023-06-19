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
            account,
            password,
            token,
            challenge,
            validate,
            seccode,
        } = req.body;
        const passwordEncode = await getPasswordHash(password);

        const payload = {
            username: account,
            password: passwordEncode,
            keep: 0,
            token,
            challenge,
            validate,
            seccode,
        };
        const response = await axios.post(
            'https://passport.bilibili.com/x/passport-login/web/login',
            querystring.stringify(payload),
        );
        if (response.data['code'] != 0) {
            console.error(response.data);
            throw new Error('login failed.');
        }

        console.log(response.data);
        console.log(response.headers['set-cookie']);
        console.log(response.data['data']['refresh_token']);

        res.status(200).json('login success');
    } catch (err) {
        if (err instanceof Error) {
            res.status(400).json(err.message);
        }
    }
}


async function getPasswordHash(password: string): Promise<string> {
    const response = await axios.get('https://passport.bilibili.com/x/passport-login/web/key');
    if (response.status != 200) {
        console.error(response.data);
        throw new Error('get rsa key failed.');
    }

    const { hash, key } = response.data['data'];
    const rsaKey = crypto.createPublicKey(key);
    const passwordRSA = crypto.publicEncrypt(
        {
            key,
            padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        Buffer.from(hash + password),
    ).toString('base64');

    return passwordRSA;
}