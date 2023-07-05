import type { NextApiRequest, NextApiResponse } from 'next'
import { StreamChat } from 'stream-chat';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method != 'POST') return res.status(405).json('Only post allowed.');

    const api_key = process.env.STEAMIO_KEY!;
    const api_secret = process.env.STEAMIO_SECRET;

    const user_id = req.body.user_id;
    if (!user_id) return res.status(400).json('user_id field is required.');

    const serverClient = StreamChat.getInstance(api_key, api_secret);
    const token = serverClient.createToken(user_id);
    res.status(200).json({
        token: 'no-token',
        stream_key: api_key,
        agora_key: process.env.AGORA_KEY,
    });
}
